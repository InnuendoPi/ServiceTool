"""Recipe adapters and local draft storage. No device writes or SQLite migrations."""
import base64
import copy
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
import threading
import time
from urllib import request, parse, error
import uuid


MAX_JSON = 8 * 1024 * 1024
MAX_STEPS = 30
LOCK = threading.RLock()


def number(value, default=0):
    if value in (None, ""):
        return default
    result = float(str(value).replace(",", "."))
    if not math.isfinite(result):
        raise ValueError("Non-finite recipe value")
    return int(result) if result.is_integer() else result


def decode(content, allow_list=False):
    if isinstance(content, bytes):
        if len(content) > MAX_JSON:
            raise ValueError("Recipe file too large")
        content = content.decode("utf-8-sig")
    value = json.loads(content) if isinstance(content, str) else copy.deepcopy(content)
    if not isinstance(value, dict) and not (allow_list and isinstance(value, list)):
        raise ValueError("Expected a JSON object")
    return value


def step(name, temp=0, duration=0, auto=True, original=None):
    return {"id": uuid.uuid4().hex, "Rast": str(name), "Temperatur": math.floor(number(temp) + 0.5),
            "Dauer": number(duration), "autonext": bool(auto), "original": original or {}}


def draft(name="", source="Brautomat"):
    return {"schema": 1, "id": uuid.uuid4().hex, "name": name, "generation": "1.67+",
            "steps": [], "dock": [], "misc": {}, "source": {"type": source},
            "notices": [], "snapshot": None}


def boil_steps(out, duration, additions, temp, after=0):
    """Source times are minutes before boil end; step durations are intervals."""
    duration = number(duration)
    if duration <= 0:
        if additions:
            out["notices"].append("boil_missing")
            out["dock"].extend(step(label, temp, 0, False, original) for label, _, original in additions)
        return
    events = {}
    for label, minutes, original in additions:
        minutes = number(minutes)
        if minutes < 0 or minutes > duration:
            out["notices"].append("addition_time")
            out["dock"].append(step(label, temp, 0, False, original))
            continue
        events.setdefault(duration - minutes, []).append((label, original))
    points = sorted(set([0, duration, *events]))
    for index, elapsed in enumerate(points):
        items = events.get(elapsed, [])
        name = " + ".join(item[0] for item in items) or "Kochen"
        interval = points[index + 1] - elapsed if index + 1 < len(points) else 0
        if interval or items:
            out["steps"].append(step(name, temp, interval, True,
                                     {"additions": [item[1] for item in items], "elapsed": elapsed}))
    if number(after) > 0:
        out["steps"].append(step("Nachisomerisierung", 0, after, False))


def import_recipe(content, options=None):
    raw = decode(content, allow_list=True)
    if isinstance(raw, list):
        if not raw or any(not isinstance(item, dict) or "step name" not in item for item in raw):
            raise ValueError("Unknown recipe format")
        raw = {"misc": [{}], "mash": [{"Rast": item.get("step name", ""),
                "Temperatur": item.get("temperature", 0), "Dauer": item.get("duration", 0),
                "autonext": bool(item.get("autonext"))} for item in raw]}
    if "Rasten" in raw and ("Sud" in raw or "Global" in raw) and "Maischplan" not in raw:
        original = copy.deepcopy(raw)
        raw.setdefault("Sud", {})
        raw["Maischplan"] = []
        for item in raw["Rasten"]:
            typ = number(item.get("Typ"))
            mapped = dict(item, Typ=4 if typ == 3 else typ, TempRast=item.get("Temp", 0),
                          DauerRast=item.get("Dauer", 0))
            if typ in (0, 2):
                mapped.update(TempWasser=item.get("Param1", 0), AnteilWasser=100*number(item.get("Mengenfaktor")))
            if typ == 3:
                mapped.update(TempExtra1=item.get("Param1"), DauerExtra1=item.get("Param2"),
                              TempExtra2=item.get("Param3"), DauerExtra2=item.get("Param4"))
            raw["Maischplan"].append(mapped)
        value = import_recipe(raw, options)
        value["source"]["original"] = original
        if "Sud" not in original:
            value["notices"].append("partial_recipe")
        return value
    if raw.get("schema") == 1 and "steps" in raw:
        return validate_draft(raw)
    options = {"boil_temp": 100, "mash_out_temp": 78, "first_wort_temp": 78,
               "whirlpool_temp": 80, **(options or {})}
    boil_temp = number(options.get("boil_temp"), 100)
    out = draft()
    out["source"]["original"] = raw
    out["source"]["options"] = copy.deepcopy(options)
    steps = out["steps"]
    additions = []
    after = 0
    post_boil = []
    mash_additions = []
    aroma = []
    if isinstance(raw.get("mash"), list):
        if any(not isinstance(item, dict) or "Rast" not in item for item in raw["mash"]):
            raise ValueError("Invalid Brautomat mash plan")
        meta = (raw.get("misc") or [{}])[0]
        out["name"] = str(meta.get("Sudname", ""))
        out["misc"] = copy.deepcopy(meta)
        for item in raw["mash"]:
            s = step(item.get("Rast", ""), item.get("Temperatur"), item.get("Dauer"),
                     item.get("autonext", False), item)
            steps.append(s)
        return validate_draft(out)
    if "Maischplan" in raw and "Sud" in raw:
        out["source"]["type"] = "KBH2"
        sud = raw["Sud"]
        out["name"] = str(sud.get("Sudname", ""))
        duration = sud.get("Kochdauer", 0)
        after = sud.get("Nachisomerisierungszeit", 0)
        for index, item in enumerate(raw["Maischplan"]):
            typ = number(item.get("Typ"))
            name = item.get("Name") or f"Maischschritt {len(steps) + 1}"
            if typ in (0, 2, 3):
                amounts = []
                # KBH2 2.6.4 ModelMaischplan: portions of total grain and main water.
                for field, share, total, label, unit in (
                        ("MengeMalz", "AnteilMalz", "erg_S_Gesamt", "Schüttung", "kg"),
                        ("MengeWasser", "AnteilWasser", "erg_WHauptguss", "Wasser", "l")):
                    if typ == 2 and field == "MengeMalz":
                        continue
                    amount = item.get(field)
                    if amount in (None, "") and item.get(share) not in (None, "") and sud.get(total) not in (None, ""):
                        amount = number(item[share]) / 100 * number(sud[total])
                    if amount not in (None, "") and number(amount) > 0:
                        amounts.append(f"{number(amount):.1f} {unit} {label}")
                if amounts:
                    name += " · " + " + ".join(amounts)
            temp = item.get("TempWasser") if typ in (0, 2) and number(item.get("TempWasser")) else item.get("TempRast")
            auto = typ not in (0, 3, 4)
            if typ == 1 and index == len(raw["Maischplan"]) - 1 and math.floor(number(temp) + 0.5) >= 75:
                auto = False
            steps.append(step(name, temp, item.get("DauerRast"), auto, item))
            if typ == 4:
                for suffix, t, d in (("Rast", "TempExtra2", "DauerExtra2"), ("Kochen", "TempExtra1", "DauerExtra1")):
                    if number(item.get(t)) > 0 and number(item.get(d)) > 0:
                        steps.append(step(f"{suffix} {name}", item[t], item[d], True, item))
                steps.append(step(f"Zubrühen {name}", item.get("TempRast"), 0, False, item))
            elif typ not in (0, 1, 2, 3):
                out["notices"].append("unmapped_step")
        for item in raw.get("Hopfengaben", []):
            typ = number(item.get("Vorderwuerze"))
            label = f'{item.get("Name", "Hopfen")} {number(item.get("erg_Menge")):.1f} g'
            if typ in (0, 2, 3, 4):
                additions.append((label,
                                  duration if typ == 2 else 0 if typ == 4 else item.get("Zeit"), item))
            elif typ == 1:
                steps.append(step("VWH " + label, options.get("first_wort_temp", 78), 0, False, item))
            elif typ == 5:
                post_boil.append(step("WPH " + label, options.get("whirlpool_temp", 80), 0, False, item))
            else:
                out["dock"].append(step(label, 0, 0, False, item))
                out["notices"].append("unmapped_addition")
        for item in raw.get("WeitereZutatenGaben", []):
            units = {0: "g", 1: "g", 2: "mg", 3: "Stk", 4: "l", 5: "ml"}
            label = f'{item.get("Name", "Zugabe")} {number(item.get("erg_Menge"))} {units.get(number(item.get("Einheit")), "?")}'
            if number(item.get("Zeitpunkt")) == 2 and steps:
                mash_additions.append(step(label, steps[0]["Temperatur"], item.get("Zugabedauer", 0), True, item))
            else:
                out["dock"].append(step(label, 0, 0, False, item))
                out["notices"].append("unmapped_addition")
    elif "Rezeptquelle" in raw and "Maischform" in raw:
        out["source"]["type"] = "MMuM"
        out["name"] = str(raw.get("Name", ""))
        duration = raw.get("Kochzeit_Wuerze", 0)
        if raw.get("Maischform") == "dekoktion":
            for item in raw.get("Dekoktionen", []):
                form = item.get("Form") or "Einmaischen"
                if form == "Einmaischen":
                    water = item.get("Temperatur_ist", item.get("Temperatur_Wasser", item.get("Temperatur", 0)))
                    result = item.get("Temperatur_resultierend", water)
                    if number(water) != number(result):
                        steps.append(step("Hauptguss aufheizen", water, 0, True, item))
                    steps.append(step(form, result, item.get("Rastzeit"), False, item))
                    continue
                if form == "Dickmaische":
                    steps.append(step(form + " rasten", item.get("Teilmaische_Temperatur"), item.get("Teilmaische_Rastzeit"), True, item))
                if form in ("Dickmaische", "Dünnmaische", "Läutermaische"):
                    steps.append(step(form + " kochen", boil_temp, item.get("Teilmaische_Kochzeit"), True, item))
                steps.append(step(form, item.get("Temperatur_resultierend", item.get("Temperatur", 0)), item.get("Rastzeit"), False, item))
        else:
            if raw.get("Einmaischtemperatur") is not None:
                steps.append(step("Einmaischen", raw["Einmaischtemperatur"], 0, False))
            for i, item in enumerate(raw.get("Rasten", [])):
                steps.append(step(f"Rast {i + 1}", item.get("Temperatur"), item.get("Zeit"), True, item))
        if raw.get("Abmaischtemperatur") is not None:
            steps.append(step("Abmaischen", raw["Abmaischtemperatur"], 0, False))
        for item in raw.get("Hopfenkochen", []):
            if item.get("Typ", "Standard") == "Standard":
                additions.append((f'{item.get("Sorte", "Hopfen")} {number(item.get("Menge"))} g',
                                  item.get("Zeit"), item))
            elif item.get("Typ") in ("Vorderwuerze", "Vorderwürze"):
                steps.append(step("VWH " + item.get("Sorte", "Hopfen"), options.get("first_wort_temp", 78), 0, False, item))
            elif item.get("Typ") == "Whirlpool":
                post_boil.append(step("WPH " + item.get("Sorte", "Hopfen"), options.get("whirlpool_temp", 80), 0, False, item))
            else:
                out["dock"].append(step(item.get("Sorte", "Hopfen"), 0, 0, False, item))
                out["notices"].append("unmapped_addition")
        for item in raw.get("Gewuerze_etc", []):
            unit = {"Stück": "Stk"}.get(item.get("Einheit"), item.get("Einheit", ""))
            label = f'{item.get("Name", "Zugabe")} {number(item.get("Menge")):.1f} {unit}'.strip()
            if item.get("Kochzeit") not in (None, ""):
                additions.append((label, item["Kochzeit"], item))
            else:
                out["dock"].append(step(label, 0, 0, False, item))
                out["notices"].append("unmapped_addition")
        if not raw.get("Ausschlagwuerze") or not raw.get("Sudhausausbeute"):
            out["notices"].append("source_volume")
    else:
        recipe = raw.get("recipe", raw)
        if not isinstance(recipe.get("mash"), dict) or "steps" not in recipe["mash"]:
            raise ValueError("Unknown recipe format: expected Brautomat, KBH2, MMuM or Brewfather")
        out["source"]["type"] = "Brewfather"
        out["name"] = str(recipe.get("name", ""))
        equipment = recipe.get("equipment") or {}
        duration = recipe.get("boilTime", equipment.get("boilTime", 0))
        after = next((number(value) for value in (equipment.get("whirlpoolTime"),
                     recipe.get("whirlpoolTime"), recipe.get("hopStandMinutes"))
                     if value not in (None, "")), 0)
        for item in recipe["mash"]["steps"]:
            steps.append(step(item.get("name", "Rast"), item.get("stepTemp"), item.get("stepTime"),
                              item.get("type") != "Decoction", item))
            if item.get("type") == "Decoction":
                out["notices"].append("decoction_review")
        # Water treatment remains in source.original, not in executable steps or Dock.
        miscs = [item for item in recipe.get("miscs", [])
                 if not item.get("waterAdjustment") and item.get("type") != "Water Agent"]
        for item in recipe.get("hops", []) + miscs:
            if item.get("use") in ("Boil", "First Wort"):
                additions.append((f'{item.get("name", "Zugabe")} {number(item.get("amount"))} {item.get("unit", "g")}',
                                  duration if item.get("use") == "First Wort" else item.get("time"), item))
            elif item.get("use") == "Aroma":
                label = f'WPH {item.get("name", "Hopfen")} {number(item.get("amount")):.1f} {item.get("unit", "g")}'
                if item.get("time") in (None, "") or number(item["time"]) < 0:
                    out["dock"].append(step(label, 0, 0, False, item))
                    out["notices"].append("unmapped_addition")
                else:
                    temp = number(item.get("temp")) or number(options["whirlpool_temp"])
                    aroma.append((label, number(item["time"]), temp, item))
            else:
                out["dock"].append(step(item.get("name", "Zugabe"), 0, 0, False, item))
                out["notices"].append("unmapped_addition")
    if mash_additions:
        steps[1:1] = mash_additions
    out["misc"] = {"Kochdauer": number(duration), "Nachiso": number(after)}
    boil_steps(out, duration, additions, boil_temp, 0 if aroma else after)
    if aroma:
        # Aroma times are remaining contact times, not consecutive full holds.
        # The declared hopstand/Nachiso and its additions form one phase.
        phase = max(number(after), max(item[1] for item in aroma))
        ordered = sorted(aroma, key=lambda item: item[1], reverse=True)
        if phase > ordered[0][1]:
            steps.append(step("Nachisomerisierung", 0,
                              phase - ordered[0][1], False))
        for index, (label, remaining, temp, original) in enumerate(ordered):
            next_time = ordered[index + 1][1] if index + 1 < len(ordered) else 0
            steps.append(step(label, temp, remaining - next_time, False, original))
    steps.extend(post_boil)
    out["notices"] = list(dict.fromkeys(out["notices"]))
    return validate_draft(out)


def normalize_command(item):
    match = re.fullmatch(r"([^:]+):([^:]*?)(:.*|!)?", item["Rast"].strip())
    if not match:
        return
    command, argument = match[1].strip(), match[2].strip()
    if not command or not argument or (not re.fullmatch(r"ON|OFF|[0-9]{1,3}", argument, re.I)
                                       and not command.upper().endswith("PROFIL")):
        return
    item["Rast"] = command + ":" + argument + (match[3] or "")
    if "command" in item:
        item["command"] = command
    if "argument" in item:
        item["argument"] = argument


def validate_draft(value):
    result = decode(value)
    if result.get("schema") != 1:
        raise ValueError("Unsupported draft version")
    for collection in ("steps", "dock"):
        if not isinstance(result.get(collection), list) or len(result[collection]) > 1000:
            raise ValueError("Invalid draft steps")
        if collection == "steps" and len(result[collection]) > MAX_STEPS:
            raise ValueError("Ein Maischeplan darf maximal 30 Schritte enthalten (maximum 30 steps).")
        for item in result[collection]:
            if not isinstance(item, dict) or not isinstance(item.get("Rast"), str):
                raise ValueError("Invalid step")
            normalize_command(item)
            item["Temperatur"] = math.floor(number(item.get("Temperatur")) + 0.5)
            number(item.get("Dauer"))
    ids = [s.get("id") for s in result["steps"] + result["dock"]]
    if any(not isinstance(i, str) or not i for i in ids) or len(ids) != len(set(ids)):
        raise ValueError("Duplicate or missing step IDs")
    return result


def export_plan(value):
    value = validate_draft(value)
    # Advisory rules never gate this conversion. JSON must still be representable.
    meta = {"Kochdauer": 0, "Nachiso": 0, **copy.deepcopy(value.get("misc", {}))}
    meta["Sudname"] = str(value.get("name", ""))
    meta["File"] = "/Rezepte/" + filename(value.get("name") or "Maischeplan") + ".json"
    return {"misc": [meta], "mash": [
        {**(copy.deepcopy(s.get("original", {})) if value.get("source", {}).get("type") == "Brautomat" else {}),
         "Rast": s["Rast"], "Temperatur": number(s.get("Temperatur")),
         "Dauer": number(s.get("Dauer")), "autonext": bool(s.get("autonext"))}
        for s in value["steps"]]}


def filename(name):
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", str(name)).strip(" .")[:100] or "Maischeplan"


def kbh_database(path):
    p = Path(path).expanduser().resolve(strict=True)
    connection = sqlite3.connect(p.as_uri() + "?mode=ro", uri=True, timeout=2)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only=ON")
    return connection


def kbh_read(path, sud_id=None):
    db = kbh_database(path)
    try:
        db.execute("BEGIN")
        if sud_id is None:
            columns = {r["name"] for r in db.execute('PRAGMA table_info("Sud")')}
            saved = 'Gespeichert' if 'Gespeichert' in columns else 'NULL'
            watchlist = 'MerklistenID' if 'MerklistenID' in columns else '0'
            return [dict(r) for r in db.execute(
                'SELECT ID AS id, Sudname AS name, Status AS status, Sudnummer AS number, '
                'Braudatum AS brewed_at, Erstellt AS created_at, '
                f'{saved} AS saved_at, {watchlist} AS watchlist_id FROM Sud ORDER BY ID DESC')]
        row = db.execute("SELECT * FROM Sud WHERE ID=?", (int(sud_id),)).fetchone()
        if row is None:
            raise ValueError("Recipe not found")
        result = {"Sud": dict(row)}
        for table in ("Maischplan", "Hopfengaben", "WeitereZutatenGaben"):
            result[table] = [{k: r[k] for k in r.keys() if k not in ("ID", "SudID")}
                             for r in db.execute(f'SELECT * FROM "{table}" WHERE SudID=? ORDER BY ID', (int(sud_id),))]
        result["Global"] = dict(db.execute("SELECT * FROM Global LIMIT 1").fetchone())
        return result
    finally:
        db.close()


class NoRecipeRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Do not forward user credentials to a redirect destination.
        return None


def remote_json(url, headers=None):
    try:
        with request.build_opener(NoRecipeRedirect()).open(request.Request(url, headers=headers or {}), timeout=25) as response:
            content = response.read(MAX_JSON + 1)
        if len(content) > MAX_JSON:
            raise ValueError("Remote recipe too large")
        return json.loads(content.decode("utf-8-sig"))
    except error.HTTPError as exc:
        if exc.code == 429:
            raise ValueError(f'API rate limit; Retry-After: {exc.headers.get("Retry-After", "unknown")}') from None
        raise ValueError(f"Recipe API HTTP {exc.code}") from None
    except error.URLError:
        raise ValueError("Recipe API unavailable") from None


def brewfather(settings, kind="recipes", item_id="", cursor=""):
    if kind not in ("recipes", "batches"):
        raise ValueError("Invalid Brewfather source")
    if item_id and not re.fullmatch(r"[A-Za-z0-9_-]+", str(item_id)):
        raise ValueError("Invalid Brewfather recipe ID")
    user, key = settings.get("brewfather_user", ""), settings.get("brewfather_key", "")
    if not user or not key:
        raise ValueError("Brewfather credentials missing")
    auth = base64.b64encode(f"{user}:{key}".encode()).decode()
    suffix = "/" + parse.quote(str(item_id), safe="") if item_id else "?" + parse.urlencode(
        {"limit": 50, "complete": "false",
         **({"include": "_created,_timestamp,_timestamp_ms,createdAt,updatedAt"} if kind == "recipes" else {}),
         **({"start_after": cursor} if cursor else {})})
    return remote_json("https://api.brewfather.app/v2/" + kind + suffix, {"Authorization": "Basic " + auth})


def snapshot(config, profiles=None, remote=None, firmware=""):
    """Keep only design data, never WiFi credentials or service secrets."""
    config = decode(config)
    misc = (config.get("misc") or [{}])[0]
    return {"captured_at": time.time(), "firmware": firmware or misc.get("VER", ""),
            "actors": [{k: a[k] for k in ("NAME", "PWM", "PWMSW", "PIN") if k in a} for a in config.get("actors", [])],
            "kettles": [{k: a[k] for k in ("name", "enabled", "pinw", "piny") if k in a} for a in config.get("kettles", [])],
            "sensors": [{k: a[k] for k in ("NAME", "TYPE") if k in a} for a in config.get("sensors", [])],
            "multidevice": copy.deepcopy(misc.get("multidevice", {})),
            "profiles": profiles or {}, "remote": remote or {},
            "complete": profiles is not None,
            "remote_complete": remote is not None and all(
                w.get("actorsFresh") and w.get("kettlesFresh")
                for w in remote.get("workers", []) if w.get("id") and w.get("enabled", True))}


def preserve_worker_resources(current, previous):
    """Keep offline inventories only for the same master and configured worker."""
    remote = current.get("remote") or {}
    old_remote = (previous or {}).get("remote") or {}
    if not remote.get("master_id") or remote.get("master_id") != old_remote.get("master_id"):
        return current
    old_workers = {w.get("id"): w for w in old_remote.get("workers", []) if w.get("id")}
    for worker in remote.get("workers", []):
        old = old_workers.get(worker.get("id"))
        if not old or worker.get("host") != old.get("host"):
            continue
        if "configuration" not in worker and old.get("configuration"):
            worker["configuration"] = copy.deepcopy(old["configuration"])
            worker["configuration_cached"] = True
        for field, fresh in (("actors", "actorsFresh"), ("kettles", "kettlesFresh"),
                             ("sensors", "sensorsFresh"), ("profiles", "profilesFresh")):
            if not worker.get(field) and not worker.get(fresh) and old.get(field):
                worker[field] = copy.deepcopy(old[field])
                worker[fresh] = False
                worker.setdefault("cached_resources", []).append(field)
                current["remote_complete"] = False
                if field == "kettles" and remote.get("kettleRoles") != old_remote.get("kettleRoles"):
                    for kettle in worker[field]:
                        kettle["selected"] = False
    return current


class DesignerStore:
    def __init__(self, root):
        self.root = Path(root)

    def read(self, name, default):
        path = self.root / name
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else copy.deepcopy(default)

    def write(self, name, value):
        with LOCK:
            self.root.mkdir(parents=True, exist_ok=True)
            target = self.root / name
            temp = target.with_suffix(".tmp")
            temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
            temp.replace(target)

    def inventory(self, action, data, root, *, inventory_root=None):
        root = Path(root).resolve()
        root.mkdir(parents=True, exist_ok=True)
        with LOCK:
            state = self.read("inventory.json", {})
            boundary = Path(inventory_root).resolve() if inventory_root is not None else root
            def target(path):
                from explorer import clean_path
                raw = str(path)
                if inventory_root is None:
                    raw = raw.removeprefix("/Rezepte/")
                value = (boundary / clean_path(raw).lstrip("/")).resolve()
                if not value.is_relative_to(boundary) or value.suffix.lower() != ".json" or value.name.startswith("."):
                    raise ValueError("Invalid inventory recipe path")
                return value
            def family(path):
                match = re.fullmatch(r"(.+)_(\d+)", path.stem)
                base = path.with_name(match[1] + path.suffix) if match and path.with_name(match[1] + path.suffix).exists() else path
                older = sorted((p for p in base.parent.glob(base.stem + "_*" + base.suffix)
                                if re.fullmatch(re.escape(base.stem) + r"_\d+", p.stem)),
                               key=lambda p: int(p.stem.rsplit("_", 1)[1]))
                return base, older
            def record(path):
                content = path.read_bytes()
                old = state.get(str(path), {})
                if old.get("sha256") != hashlib.sha256(content).hexdigest():
                    old = {"id": uuid.uuid4().hex, "draft": import_recipe(content)}
                return old
            if action == "inventory-load":
                path = target(data["path"])
                entry = record(path)
                value = validate_draft(entry["draft"])
                value["id"] = uuid.uuid4().hex
                for key in ("group_id", "version"):
                    value.pop(key, None)
                base, _ = family(path)
                value["inventory_ref"] = {"id": entry["id"], "root": str(boundary), "name": base.stem, "folder": "/" + base.parent.relative_to(boundary).as_posix().strip(".")}
                entry["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
                state[str(path)] = entry
                self.write("inventory.json", state)
                return value
            writes = {}
            if inventory_root is not None:
                folder = data.get("folder") or (data.get("draft", {}).get("inventory_ref") or {}).get("folder") or "/Rezepte"
                if action == "inventory-delete":
                    folder = "/" + target(data["path"]).parent.relative_to(boundary).as_posix().strip(".")
                destination = target(str(folder).rstrip("/") + "/placeholder.json").parent
                # Keep the established notes file for the original recipe tree.
                root = root if destination.is_relative_to(root) else destination
            else:
                destination = root
            info_path = root / ".inventory-info.json"
            info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {}
            def relative(path):
                return path.relative_to(root).as_posix()
            if action == "inventory-publish":
                value = validate_draft(data["draft"])
                name = filename(value.get("name", ""))
                if not value.get("name", "").strip():
                    raise ValueError("Planname fehlt")
                ref = value.get("inventory_ref") or {}
                path = destination / (name + ".json")
                if ref.get("name") == name and (not data.get("folder") or data["folder"].rstrip("/") == ref.get("folder", "/Rezepte").rstrip("/")):
                    found = next((Path(k) for k, v in state.items() if v.get("id") == ref.get("id") and Path(k).is_relative_to(boundary)), None)
                    if not found or not found.exists() or not found.resolve().is_relative_to(boundary) or not Path(ref.get("root", "")).resolve().is_relative_to(boundary):
                        raise ValueError("Inventarversion wurde gelöscht oder verschoben. Plan unter neuem Namen übernehmen.")
                    path, _ = family(found)
                base, older = family(path)
                if path != base:
                    raise ValueError("Planname kollidiert mit einer vorhandenen Versionsnummer")
                if base.exists() and not data.get("replace"):
                    archived = base.with_name(f"{base.stem}_{max([int(p.stem.rsplit('_', 1)[1]) for p in older], default=0)+1}{base.suffix}")
                    writes[archived] = base.read_bytes()
                    state[str(archived)] = record(base)
                    if relative(base) in info:
                        info[relative(archived)] = info[relative(base)]
                info.pop(relative(base), None)
                content = json.dumps(export_plan(value), ensure_ascii=False, indent=2).encode("utf-8")
                writes[base] = content
                entry = {"id": uuid.uuid4().hex, "draft": value}
                state[str(base)] = entry
                group = value.get("group_id", value["id"])
                for item in self.handle("list", {}):
                    if item["group_id"] == group:
                        writes[self.root / ("draft-" + item["id"] + ".json")] = None
                result = copy.deepcopy(value)
                result["id"] = uuid.uuid4().hex
                result.pop("group_id", None)
                result.pop("version", None)
                result["inventory_ref"] = {"id": entry["id"], "root": str(boundary), "name": base.stem, "folder": "/" + base.parent.relative_to(boundary).as_posix().strip(".")}
            elif action == "inventory-delete":
                path = target(data["path"])
                if not path.exists():
                    raise FileNotFoundError(path.name)
                base, older = family(path)
                family_paths = older + ([base] if base.exists() else [])
                remaining = [] if data.get("all_versions") else [p for p in family_paths if p != path]
                retained = [(p.read_bytes(), record(p), info.get(relative(p))) for p in remaining]
                for p in family_paths:
                    writes[p] = None
                    state.pop(str(p), None)
                    info.pop(relative(p), None)
                for index, (content, entry, details) in enumerate(retained):
                    dest = base if index == len(retained)-1 else base.with_name(f"{base.stem}_{index+1}{base.suffix}")
                    writes[dest] = content
                    state[str(dest)] = entry
                    if details is not None:
                        info[relative(dest)] = details
                result = {"deleted": str(path), "done": True}
            else:
                raise ValueError("Unknown inventory action")
            for path, content in writes.items():
                if content is not None and str(path) in state:
                    state[str(path)]["sha256"] = hashlib.sha256(content).hexdigest()
            if info_path.exists() or info:
                writes[info_path] = json.dumps(info, ensure_ascii=False, indent=2).encode("utf-8")
            writes[self.root / "inventory.json"] = json.dumps(state, ensure_ascii=False, indent=2).encode("utf-8")
            # Roll back every touched file on a write failure; drafts disappear only after inventory writes.
            previous = {p: p.read_bytes() if p.exists() else None for p in writes}
            try:
                for path, content in writes.items():
                    path.parent.mkdir(parents=True, exist_ok=True)
                    if content is None:
                        path.unlink(missing_ok=True)
                    else:
                        temp = path.with_name(path.name + ".designer-tmp")
                        try:
                            temp.write_bytes(content)
                            temp.replace(path)
                        finally:
                            temp.unlink(missing_ok=True)
            except Exception:
                for path, content in previous.items():
                    if content is None:
                        path.unlink(missing_ok=True)
                    else:
                        path.write_bytes(content)
                raise
            return result

    def settings(self, payload=None):
        with LOCK:
            cfg = self.read("settings.json", {})
            if payload is not None:
                for key in ("brewfather_user", "kbh_path"):
                    if key in payload:
                        cfg[key] = str(payload[key]).strip()
                if isinstance(payload.get("import_options"), dict):
                    opts = payload["import_options"]
                    cfg["import_options"] = {"boil_temp": number(opts.get("boil_temp"), 100),
                                             "mash_out_temp": number(opts.get("mash_out_temp"), 78),
                                             "first_wort_temp": number(opts.get("first_wort_temp"), 78),
                                             "whirlpool_temp": number(opts.get("whirlpool_temp"), 80)}
                if payload.get("clear_key"):
                    cfg.pop("brewfather_key", None)
                elif payload.get("brewfather_key"):
                    cfg["brewfather_key"] = str(payload["brewfather_key"]).strip()
                self.write("settings.json", cfg)
            return {k: v for k, v in cfg.items() if k != "brewfather_key"} | {"key_saved": bool(cfg.get("brewfather_key"))}

    def handle(self, action, data):
        if action == "settings":
            return self.settings(data.get("settings"))
        if action == "import":
            return import_recipe(data["recipe"], data.get("options"))
        if action == "export":
            return export_plan(data["draft"])
        if action in ("dock-load", "dock-save"):
            with LOCK:
                if action == "dock-save":
                    value = {"schema": 1, "steps": [], "dock": data.get("dock", [])}
                    dock = validate_draft(value)["dock"]
                    self.write("dock.json", {"dock": dock})
                return self.read("dock.json", {"dock": []})
        if action == "save":
            value = validate_draft(data["draft"])
            if not re.fullmatch(r"[a-f0-9]{32}", str(value.get("id", ""))):
                raise ValueError("Invalid draft ID")
            with LOCK:
                previous = self.read("draft-" + value["id"] + ".json", {})
                group = previous.get("group_id", previous.get("id", value["id"]))
                version = previous.get("version", 1)
                if data.get("new_variant"):
                    value["id"] = uuid.uuid4().hex
                    group, version, previous = value["id"], 1, {}
                if data.get("new_version") and previous:
                    versions = [v.get("version", 1) for v in self.handle("list", {})
                                if v["group_id"] == group]
                    version = max(versions, default=0) + 1
                    value["id"] = uuid.uuid4().hex
                now = time.time()
                created = previous.get("created_at") if previous and not data.get("new_version") else now
                value.update(group_id=group, version=version, created_at=created, updated_at=now)
                self.write("draft-" + value["id"] + ".json", value)
            return value
        if action == "list":
            with LOCK:
                return [{"id": v["id"], "group_id": v.get("group_id", v["id"]),
                         "version": v.get("version", 1), "name": v.get("name", ""),
                         "created_at": v.get("created_at", getattr(p.stat(), "st_birthtime", None)),
                         "updated_at": v.get("updated_at", 0)}
                        for p in sorted(self.root.glob("draft-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
                        for v in [self.read(p.name, {})]]
        if action in ("load", "delete"):
            if not re.fullmatch(r"[a-f0-9]{32}", str(data.get("id", ""))):
                raise ValueError("Invalid draft ID")
            with LOCK:
                name = "draft-" + data["id"] + ".json"
                if action == "delete":
                    if not (self.root / name).exists():
                        raise FileNotFoundError(name)
                    entry = self.read(name, {})
                    group = entry.get("group_id", entry.get("id"))
                    members = sorted((v for v in self.handle("list", {}) if v["group_id"] == group), key=lambda v: v["version"])
                    remaining = []
                    for member in members:
                        if data.get("all_versions") or member["id"] == data["id"]:
                            (self.root / ("draft-" + member["id"] + ".json")).unlink()
                        else:
                            remaining.append(member)
                    for index, member in enumerate(remaining, 1):
                        filename_ = "draft-" + member["id"] + ".json"
                        value = self.read(filename_, {})
                        value["version"] = index
                        self.write(filename_, value)
                    return {"deleted": data["id"]}
                return validate_draft(self.read(name, {}))
        cfg = self.read("settings.json", {})
        if action == "kbh-list":
            return kbh_read(cfg.get("kbh_path", ""))
        if action == "kbh-import":
            return import_recipe(kbh_read(cfg.get("kbh_path", ""), data["id"]), data.get("options"))
        if action in ("bf-list", "bf-import"):
            value = brewfather(cfg, data.get("kind", "recipes"), data.get("id", ""), data.get("cursor", ""))
            return import_recipe(value, data.get("options")) if action == "bf-import" else value
        if action in ("snapshot-save", "snapshot-load"):
            profile = str(data.get("profile", "primary"))
            with LOCK:
                values = self.read("snapshots.json", {})
                if action == "snapshot-save":
                    current = snapshot(data["config"], data.get("profiles"), data.get("remote"), data.get("firmware", ""))
                    values[profile] = preserve_worker_resources(current, values.get(profile))
                    values[profile]["profile_id"] = profile
                    self.write("snapshots.json", values)
                return values.get(profile)
        raise ValueError("Unknown designer action")


def validate_master_target(snap, profile, status):
    remote = snap.get("remote") or {}
    if snap.get("profile_id") != profile or not remote.get("master_id"):
        raise ValueError("Master-Konfiguration im Designer erneut vom Gerät lesen.")
    if status.get("role") != 1 or status.get("id") != remote["master_id"]:
        raise ValueError("Uploadziel ist nicht der zum Plan gehörende Master.")
    def workers(value):
        return sorted((w.get("id", ""), w.get("host", ""), w.get("enabled", True))
                      for w in value.get("workers", []) if w.get("id"))
    if workers(remote) != workers(status):
        raise ValueError("Worker-Zuordnung geändert. Master-Konfiguration erneut einlesen.")
    def roles(value):
        return sorted((r.get("role"), r.get("id"), r.get("kettle"))
                      for r in value.get("kettleRoles", []))
    # Compare configured identities/slots, not transient assignment readiness.
    # In particular, an unused role can change from absent to pending.
    # Upload stores a file; it does not start the plan.
    if not remote.get("kettleRoles") or not status.get("kettleRoles"):
        raise ValueError("Kesselzuordnung nicht verfügbar. Master-Konfiguration erneut einlesen.")
    if roles(remote) != roles(status):
        before = {str(row.get("role")): row for row in remote["kettleRoles"]}
        after = {str(row.get("role")): row for row in status["kettleRoles"]}
        differences = []
        labels = {"0": "Maische", "1": "Sud", "2": "HLT"}
        for role in sorted(before.keys() | after.keys()):
            old, new = before.get(role, {}), after.get(role, {})
            changes = [f"{field}: {old.get(field)!r} -> {new.get(field)!r}"
                       for field in ("id", "kettle") if old.get(field) != new.get(field)]
            if changes:
                differences.append(f"Kesselrolle {labels.get(role, role)} ({'; '.join(changes)})")
        raise ValueError("Kesselzuordnung weicht vom gespeicherten Stand ab: " +
                         "; ".join(differences) + ". Datei wurde nicht übertragen.")
