import json
from pathlib import Path, PureWindowsPath
import sqlite3
import tempfile
import unittest
from unittest.mock import Mock, patch

from designer import validate_master_target, DesignerStore, brewfather, export_plan, import_recipe, kbh_database, kbh_read, snapshot


class DesignerTests(unittest.TestCase):
    def test_local_command_annotation_survives_export_and_dock_save(self):
        value = import_recipe({"mash": [{"Rast": "Ruehrwerk : OFF :Läuterpause: Hinweis!"}]})
        expected = "Ruehrwerk:OFF:Läuterpause: Hinweis!"
        self.assertEqual(export_plan(value)["mash"][0]["Rast"], expected)
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            store.handle("dock-save", {"dock": value["steps"]})
            self.assertEqual(store.handle("dock-load", {})["dock"][0]["Rast"], expected)

    def test_command_whitespace_is_normalized_on_save(self):
        value = import_recipe({"mash": [{"Rast": "RHE: 100"}, {"Rast": "Rührwerk oben : ON !"},
                                        {"Rast": "MAISCHEPROFIL: Helles Bier "}, {"Rast": "Hinweis: Malz einfüllen"}]})
        self.assertEqual([s["Rast"] for s in value["steps"]],
                         ["RHE:100", "Rührwerk oben:ON!", "MAISCHEPROFIL:Helles Bier", "Hinweis: Malz einfüllen"])
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            item = value["steps"][0]
            item.update(Rast="RHE : 100", command="RHE ", argument=" 100")
            saved = store.handle("dock-save", {"dock": [item]})["dock"][0]
            self.assertEqual((saved["Rast"], saved["command"], saved["argument"]), ("RHE:100", "RHE", "100"))

    def test_update_existing_version_reloads_changed_step(self):
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            value = store.handle("save", {"draft": import_recipe({"mash": [{"Rast": "Ruehrwerk:OFF"}]})})
            identity, version = value["id"], value["version"]
            value["steps"][0]["Rast"] = "Ruehrwerk:OFF:Läuterpause"
            store.handle("save", {"draft": value, "new_version": False})
            loaded = DesignerStore(folder).handle("load", {"id": identity})
            self.assertEqual(loaded["steps"][0]["Rast"], "Ruehrwerk:OFF:Läuterpause")
            self.assertEqual((loaded["id"], loaded["version"]), (identity, version))
            self.assertEqual(len(store.handle("list", {})), 1)

    def test_plan_step_limit(self):
        recipe = {"mash": [{"Rast": str(i)} for i in range(30)]}
        value = import_recipe(recipe)
        self.assertEqual(len(export_plan(value)["mash"]), 30)
        recipe["mash"].append({"Rast": "31"})
        with self.assertRaisesRegex(ValueError, "30"):
            import_recipe(recipe)
        parked = import_recipe({"mash": [{"Rast": "Dock"}]})["steps"][0]
        value["dock"] = [parked]
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            store.handle("save", {"draft": value})
            value["steps"].append(value["dock"].pop())
            for operation in (lambda: export_plan(value),
                              lambda: store.handle("save", {"draft": value})):
                with self.assertRaisesRegex(ValueError, "30"):
                    operation()

    def test_shared_dock_is_persistent_and_separate_from_drafts(self):
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            value = import_recipe({"misc": [{"Sudname": "Plan"}], "mash": [{"Rast": "Start"}]})
            self.assertEqual(store.handle("dock-load", {})["dock"], [])
            store.handle("dock-save", {"dock": value["steps"]})
            self.assertEqual(DesignerStore(folder).handle("dock-load", {})["dock"], value["steps"])
            saved = store.handle("save", {"draft": value})
            store.handle("delete", {"id": saved["id"]})
            self.assertEqual(len(store.handle("dock-load", {})["dock"]), 1)
            with self.assertRaises(ValueError):
                store.handle("dock-save", {"dock": value["steps"] * 2})
            self.assertEqual(len(store.handle("dock-load", {})["dock"]), 1)
            store.handle("dock-save", {"dock": []})
            self.assertEqual(DesignerStore(folder).handle("dock-load", {})["dock"], [])

    def test_draft_created_and_updated_dates(self):
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            value = import_recipe({"misc": [{"Sudname": "Plan"}], "mash": []})
            with patch("designer.time.time", side_effect=[100, 200, 300]):
                first = store.handle("save", {"draft": value})
                updated = store.handle("save", {"draft": first})
                version = store.handle("save", {"draft": updated, "new_version": True})
            self.assertEqual((updated["created_at"], updated["updated_at"]), (100, 200))
            self.assertEqual((version["created_at"], version["updated_at"]), (300, 300))
            self.assertEqual({v["created_at"] for v in store.handle("list", {})}, {100, 300})

    def test_inventory_lifecycle_and_renumbering(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "Rezepte"
            store = DesignerStore(Path(folder) / "designer")
            value = import_recipe({"misc": [{"Sudname": "Plan"}], "mash": [{"Rast": "First"}]})
            value["dock"] = [dict(value["steps"][0], id="parked", Rast="Dock")]
            first = store.handle("save", {"draft": value})
            second = store.handle("save", {"draft": first, "new_version": True})
            variant = store.handle("save", {"draft": first, "new_variant": True})
            published = store.inventory("inventory-publish", {"draft": second}, root)
            self.assertEqual([v["id"] for v in store.handle("list", {})], [variant["id"]])
            self.assertNotIn("dock", json.loads((root / "Plan.json").read_text()))
            reopened = store.inventory("inventory-load", {"path": "/Rezepte/Plan.json"}, root)
            self.assertEqual(reopened["dock"], value["dock"])
            self.assertNotEqual(reopened["id"], published["id"])
            reopened["steps"][0]["Rast"] = "Second"
            store.inventory("inventory-publish", {"draft": reopened}, root)
            third = store.inventory("inventory-load", {"path": "Plan.json"}, root)
            third["steps"][0]["Rast"] = "Third"
            store.inventory("inventory-publish", {"draft": third}, root)
            held = store.inventory("inventory-load", {"path": "Plan_2.json"}, root)
            store.inventory("inventory-delete", {"path": "Plan_1.json"}, root)
            self.assertFalse((root / "Plan_2.json").exists())
            self.assertEqual(store.inventory("inventory-load", {"path": "Plan_1.json"}, root)["steps"][0]["Rast"], "Second")
            store.inventory("inventory-publish", {"draft": held}, root)
            store.inventory("inventory-delete", {"path": "Plan.json"}, root)
            self.assertEqual(store.inventory("inventory-load", {"path": "Plan.json"}, root)["steps"][0]["Rast"], "Third")
            store.inventory("inventory-delete", {"path": "Plan.json", "all_versions": True}, root)
            self.assertEqual(list(root.glob("*.json")), [])
            with self.assertRaises(ValueError):
                store.inventory("inventory-publish", {"draft": held}, root)
            with self.assertRaises(ValueError):
                store.inventory("inventory-load", {"path": "../escape.json"}, root)

    def test_inventory_device_first_and_type_first(self):
        with tempfile.TemporaryDirectory() as folder:
            inventory = Path(folder) / "inventory"
            store = DesignerStore(Path(folder) / "designer")
            def action(name, data):
                return store.inventory(name, data, inventory / "Rezepte", inventory_root=inventory)
            for directory in ("/worker1/Rezepte", "/Rezepte/worker1", "/"):
                with self.subTest(directory=directory):
                    value = import_recipe({"misc": [{"Sudname": "Plan"}], "mash": [{"Rast": "First"}]})
                    saved = action("inventory-publish", {"draft": value, "folder": directory})
                    self.assertEqual(saved["inventory_ref"]["folder"], directory)
                    location = directory.rstrip("/") + "/Plan.json"
                    opened = action("inventory-load", {"path": location})
                    opened["steps"][0]["Rast"] = "Second"
                    action("inventory-publish", {"draft": opened})
                    archived = directory.rstrip("/") + "/Plan_1.json"
                    self.assertEqual(action("inventory-load", {"path": archived})["steps"][0]["Rast"], "First")
                    exported = export_plan(opened)
                    self.assertEqual(exported["misc"][0]["File"], "/Rezepte/Plan.json")
                    action("inventory-delete", {"path": archived})
                    self.assertFalse((inventory / archived.lstrip("/")).exists())
                    self.assertEqual(action("inventory-load", {"path": location})["steps"][0]["Rast"], "Second")
                    action("inventory-delete", {"path": location, "all_versions": True})
                    self.assertFalse((inventory / location.lstrip("/")).exists())
            for bad in ("/../outside", "/worker/../../outside", "C:/outside"):
                with self.assertRaises(ValueError):
                    action("inventory-publish", {"draft": value, "folder": bad})

    def test_inventory_publish_failure_keeps_draft_and_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / "Rezepte"
            store = DesignerStore(Path(folder) / "designer")
            value = store.handle("save", {"draft": import_recipe({"misc": [{"Sudname": "Plan"}], "mash": []})})
            original = Path.replace
            def fail(path, destination):
                if Path(destination).name == "inventory.json":
                    raise OSError("simulated failure")
                return original(path, destination)
            with patch.object(Path, "replace", fail), self.assertRaises(OSError):
                store.inventory("inventory-publish", {"draft": value}, root)
            self.assertEqual(store.handle("load", {"id": value["id"]}), value)
            self.assertFalse((root / "Plan.json").exists())

    def test_draft_delete_renumbers_and_preserves_other_variants(self):
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            first = store.handle("save", {"draft": import_recipe({"misc": [{"Sudname": "Plan"}], "mash": []})})
            second = store.handle("save", {"draft": first, "new_version": True})
            third = store.handle("save", {"draft": first, "new_version": True})
            variant = store.handle("save", {"draft": first, "new_variant": True})
            store.handle("delete", {"id": second["id"]})
            self.assertEqual(store.handle("load", {"id": third["id"]})["version"], 2)
            store.handle("delete", {"id": third["id"], "all_versions": True})
            self.assertEqual([v["id"] for v in store.handle("list", {})], [variant["id"]])

    def test_master_upload_identity_and_roles(self):
        role = {"role": 2, "id": "worker", "kettle": 2, "assignment": "assigned"}
        snap = {"profile_id": "master", "remote": {"master_id": "abc", "kettleRoles": [role]}}
        status = {"role": 1, "id": "abc", "rolesReady": True, "kettleRoles": [role]}
        validate_master_target(snap, "master", status)
        validate_master_target(snap, "master", {**status, "rolesReady": False})
        for bad in ({**status, "id": "other"}, {**status, "role": 2},
                    {**status, "kettleRoles": []},
                    {**status, "kettleRoles": [{**role, "kettle": 1}]},
                    {**status, "workers": [{"id": "new", "host": "worker1"}]}):
            with self.assertRaises(ValueError):
                validate_master_target(snap, "master", bad)
        with self.assertRaises(ValueError):
            validate_master_target(snap, "other", status)
        with self.assertRaises(ValueError):
            validate_master_target({}, "master", status)

    def test_upload_unused_sud_role_status_change_is_not_a_new_kettle(self):
        roles = [{"role": 0, "id": "worker", "kettle": 0, "assignment": "assigned"},
                 {"role": 1, "id": "", "kettle": 1, "assignment": "absent"}]
        snap = {"profile_id": "master", "remote": {"master_id": "abc", "kettleRoles": roles}}
        changed = [dict(roles[0]), dict(roles[1], assignment="pending")]
        status = {"role": 1, "id": "abc", "rolesReady": False, "kettleRoles": changed}
        validate_master_target(snap, "master", status)
        changed[1]["id"] = "another-worker"
        with self.assertRaisesRegex(ValueError, "Kesselrolle Sud"):
            validate_master_target(snap, "master", status)

    def test_designer_upload_guard_prevents_wrong_master_write(self):
        import app
        import base64
        context = {"profile": "master", "snapshot": {"profile_id": "master", "multidevice": {"mode": 1},
                   "remote": {"master_id": "abc", "kettleRoles": [{"role": 2, "id": "worker", "kettle": 2, "assignment": "assigned"}]}}}
        data = {"designer_context": context, "base_url": "http://master", "action": "upload", "side": "device",
                "path": "/Rezepte/Test.json", "content": base64.b64encode(b'{"mash":[]}').decode()}
        with patch.object(app, "load_app_config", return_value={"active_device_id": "master", "device_url": "http://master"}), \
                patch.object(app, "json_request") as remote, patch.object(app, "file_explorer") as explorer:
            handler = object.__new__(app.AppHandler)
            handler.path = "/api/explorer/action"
            handler.headers = {}
            handler._read_json = Mock(return_value=data)
            handler._send_json = Mock()
            remote.return_value = {"role": 2, "id": "worker"}
            handler.do_POST()
            explorer.assert_not_called()
            remote.return_value = {"role": 1, "id": "abc", "rolesReady": True,
                                   "kettleRoles": context["snapshot"]["remote"]["kettleRoles"]}
            handler.do_POST()
            explorer.return_value.action.assert_called_once_with(data)

    def test_enzyme_range_roundtrip(self):
        raw = {"misc": [{"Sudname": "Test", "minh": 50.5, "maxh": 75}], "mash": []}
        value = import_recipe(raw)
        self.assertEqual(value["misc"]["minh"], 50.5)
        value["misc"]["maxh"] = 74.5
        result = export_plan(value)
        self.assertEqual(result["misc"][0]["minh"], 50.5)
        self.assertEqual(result["misc"][0]["maxh"], 74.5)

    def test_partial_legacy_kbh_export_retains_decoction_parameters(self):
        value = import_recipe({"Global": {"db_Version": 2007}, "Rasten": [
            {"Typ": 3, "Name": "Dickmaische", "Temp": 72, "Dauer": 5,
             "Param1": 95, "Param2": 10, "Param3": 70, "Param4": 15}]})
        self.assertIn("partial_recipe", value["notices"])
        self.assertEqual([s["Temperatur"] for s in value["steps"]], [72, 70, 95, 72])
        self.assertIn("Rasten", value["source"]["original"])

    def test_kbh_hop_types_and_addition_units(self):
        value = import_recipe({"Sud": {"Kochdauer": 60}, "Maischplan": [
            {"Name": "Einmaischen", "Typ": 0, "TempRast": 60}], "Hopfengaben": [
            {"Name": "Start", "Vorderwuerze": 2, "Zeit": 60},
            {"Name": "End", "Vorderwuerze": 4, "Zeit": 0}], "WeitereZutatenGaben": [
            {"Name": "A", "Zeitpunkt": 2, "Einheit": 2, "erg_Menge": 5},
            {"Name": "B", "Zeitpunkt": 2, "Einheit": 4, "erg_Menge": 1}]})
        self.assertEqual([s["Rast"] for s in value["steps"]][1:3], ["A 5 mg", "B 1 l"])
        self.assertEqual([s["Dauer"] for s in value["steps"]][-2:], [60, 0])
        self.assertEqual(value["dock"], [])

    def test_kbh_display_quantities_and_partial_grist(self):
        raw = {"Sud": {"Kochdauer": 60, "erg_S_Gesamt": 8, "erg_WHauptguss": 24},
               "Maischplan": [{"Typ": 3, "Name": "Teilschüttung", "AnteilMalz": 25,
                               "AnteilWasser": 50, "TempRast": 60, "DauerRast": 15}],
               "Hopfengaben": [{"Name": "Perle", "erg_Menge": "22,531409838914367",
                                "Zeit": 50, "Vorderwuerze": kind} for kind in (0, 1, 5, 9)]}
        before = json.dumps(raw)
        value = import_recipe(raw)
        self.assertEqual(value["steps"][0]["Rast"], "Teilschüttung · 2.0 kg Schüttung + 12.0 l Wasser")
        self.assertFalse(value["steps"][0]["autonext"])
        labels = [s["Rast"] for s in value["steps"] + value["dock"] if "Perle" in s["Rast"]]
        self.assertEqual(len(labels), 4)
        self.assertTrue(all(label.endswith("Perle 22.5 g") for label in labels))
        self.assertEqual(json.dumps(raw), before)
        self.assertEqual(value["source"]["original"], raw)
        raw["Sud"] = {}
        self.assertEqual(import_recipe(raw)["steps"][0]["Rast"], "Teilschüttung")
        raw["Maischplan"][0].update(MengeMalz=1.26, MengeWasser=0)
        self.assertEqual(import_recipe(raw)["steps"][0]["Rast"], "Teilschüttung · 1.3 kg Schüttung")

    def test_kbh_last_rest_autonext_and_integer_temperatures(self):
        raw = {"Sud": {}, "Maischplan": [
            {"Typ": 0, "Name": "Einmaischen", "TempWasser": 39.920744, "TempRast": 40},
            {"Typ": 1, "Name": "Rast", "TempRast": 75.2, "DauerRast": 10},
            {"Typ": 1, "Name": "Abmaischen", "TempRast": 78.1, "DauerRast": 1}]}
        value = import_recipe(raw, {"add_mash_out": True})
        self.assertEqual([s["Temperatur"] for s in value["steps"]], [40, 75, 78])
        self.assertEqual([s["autonext"] for s in value["steps"]], [False, True, False])
        raw["Maischplan"][-1].update(Name="Letzte Rast", TempRast=74.4)
        value = import_recipe(raw, {"add_mash_out": True})
        self.assertEqual(len(value["steps"]), 3)
        self.assertTrue(value["steps"][-1]["autonext"])
        value["steps"][-1]["Temperatur"] = 74.5
        self.assertEqual(export_plan(value)["mash"][-1]["Temperatur"], 75)
        self.assertEqual(import_recipe(value)["steps"][-1]["Temperatur"], 75)
        self.assertEqual(value["source"]["original"]["Maischplan"][0]["TempWasser"], 39.920744)

    def test_kbh_zero_quantities_are_omitted(self):
        for typ in (0, 2, 3):
            raw = {"Sud": {"erg_S_Gesamt": 10, "erg_WHauptguss": 40},
                   "Maischplan": [{"Typ": typ, "Name": "Rast", "AnteilMalz": 0, "AnteilWasser": 0}]}
            self.assertEqual(import_recipe(raw)["steps"][0]["Rast"], "Rast")
            raw["Maischplan"][0]["AnteilWasser"] = 25
            self.assertEqual(import_recipe(raw)["steps"][0]["Rast"], "Rast · 10.0 l Wasser")
            raw["Maischplan"][0].update(MengeWasser="0,0", MengeMalz=0)
            self.assertEqual(import_recipe(raw)["steps"][0]["Rast"], "Rast")

    def test_kbh_infusion_grain_and_water_quantities(self):
        raw = {"Sud": {"erg_S_Gesamt": 8, "erg_WHauptguss": 24}, "Maischplan": [
            {"Typ": 0, "Name": "Einmaischen", "AnteilMalz": 75, "AnteilWasser": 50,
             "TempWasser": 68, "TempRast": 63},
            {"Typ": 2, "Name": "Zubrühen", "AnteilWasser": 25, "TempWasser": 95, "TempRast": 72}]}
        value = import_recipe(raw)
        self.assertEqual([s["Rast"] for s in value["steps"]], [
            "Einmaischen · 6.0 kg Schüttung + 12.0 l Wasser", "Zubrühen · 6.0 l Wasser"])
        self.assertEqual([s["Temperatur"] for s in value["steps"]], [68, 95])
        self.assertEqual([s["autonext"] for s in value["steps"]], [False, True])
        self.assertEqual(value["source"]["original"], raw)

    def test_mmum_spices_merge_with_boil_schedule(self):
        raw = {"Rezeptquelle": "MMuM", "Maischform": "infusion", "Kochzeit_Wuerze": 60,
               "Hopfenkochen": [{"Sorte": "Hop", "Menge": 10, "Zeit": 10}],
               "Gewuerze_etc": [{"Name": "Spice", "Menge": 2.25, "Einheit": "g", "Kochzeit": 10},
                               {"Name": "Tablet", "Menge": 1, "Einheit": "Stück", "Kochzeit": 0},
                               {"Name": "Unknown", "Menge": 2, "Einheit": "ml"},
                               {"Name": "Early", "Menge": 3, "Einheit": "g", "Kochzeit": 90}]}
        value = import_recipe(raw)
        self.assertEqual([s["Dauer"] for s in value["steps"]], [50, 10, 0])
        self.assertIn("Hop 10 g + Spice 2.2 g", value["steps"][1]["Rast"])
        self.assertEqual(value["steps"][-1]["Rast"], "Tablet 1.0 Stk")
        self.assertEqual(len(value["dock"]), 2)
        self.assertIn("addition_time", value["notices"])
        self.assertIn("unmapped_addition", value["notices"])
        self.assertEqual(value["source"]["original"], raw)

    def test_brewfather_hopstand_and_aroma_schedule(self):
        recipe = {"name": "Aroma", "mash": {"steps": []}, "boilTime": 60,
                  "equipment": {"whirlpoolTime": 20}, "hopStandMinutes": 99,
                  "hops": [{"name": "Late", "use": "Aroma", "time": 5, "amount": 7, "temp": 75},
                           {"name": "First", "use": "Aroma", "time": 15, "amount": 10, "temp": 80},
                           {"name": "Together", "use": "Aroma", "time": 15, "amount": 20, "temp": 80},
                           {"name": "Boil", "use": "Boil", "time": 10, "amount": 5},
                           {"name": "Dry", "use": "Dry Hop", "time": 3}]}
        for raw in (recipe, {"recipe": recipe}):
            value = import_recipe(raw)
            self.assertEqual(value["misc"]["Nachiso"], 20)
            self.assertEqual([s["Dauer"] for s in value["steps"]], [50, 10, 5, 0, 10, 5])
            self.assertEqual([s["Temperatur"] for s in value["steps"]][-3:], [80, 80, 75])
            self.assertTrue(all(not s["autonext"] for s in value["steps"][2:]))
            self.assertEqual([s["Rast"] for s in value["dock"]], ["Dry"])
            self.assertEqual(value["source"]["original"], raw)
        recipe["hops"] = []
        recipe["equipment"] = {}
        recipe["whirlpoolTime"] = 8
        self.assertEqual(import_recipe(recipe)["misc"]["Nachiso"], 8)
        del recipe["whirlpoolTime"]
        self.assertEqual(import_recipe(recipe)["steps"][-1]["Dauer"], 99)
        recipe["equipment"]["whirlpoolTime"] = 0
        self.assertEqual(import_recipe(recipe)["misc"]["Nachiso"], 0)
        self.assertEqual(len(import_recipe(recipe)["steps"]), 1)

    def test_missing_boil_time_parks_additions(self):
        value = import_recipe({"Maischplan": [], "Sud": {}, "Hopfengaben": [
            {"Name": "Hop", "Zeit": 20, "Vorderwuerze": 0}]})
        self.assertEqual(len(value["dock"]), 1)
        self.assertIn("boil_missing", value["notices"])

    def test_snapshot_route_merges_resource_telemetry_without_device_writes(self):
        import app
        with tempfile.TemporaryDirectory() as root, patch.object(app, "DATA_ROOT", Path(root)), \
                patch.object(app, "load_app_config", return_value={"active_device_id": "one", "device_url": "http://test"}), \
                patch.object(app, "file_explorer") as explorer, patch.object(app, "json_request") as remote:
            explorer.return_value.read.return_value = b'{"actors":[],"misc":[{"password":"secret"}]}'
            explorer.return_value.entries.return_value = []
            remote.side_effect = [{"workers": [{"id": "w", "host": "worker"}]},
                                  {"workers": [{"id": "w", "actors": [{"name": "Pump"}],
                                                 "actorsFresh": True, "kettlesFresh": True}]}]
            handler = object.__new__(app.AppHandler)
            handler.path = "/api/designer/snapshot-device"
            handler.headers = {}
            handler._read_json = Mock(return_value={"profile": "one"})
            handler._send_json = Mock()
            handler.do_POST()
            result = handler._send_json.call_args.args[0]
            self.assertEqual(result["remote"]["workers"][0]["actors"][0]["name"], "Pump")
            self.assertEqual(result["profile_id"], "one")
            self.assertTrue(result["remote_complete"])
            self.assertNotIn("secret", json.dumps(result))
            explorer.return_value.action.assert_not_called()
            explorer.return_value.write.assert_not_called()

    def test_brautomat_roundtrip_keeps_commands_and_unknown_source(self):
        raw = {"misc": [{"Sudname": "Ähren", "Kochdauer": 60, "minh": 1}],
               "mash": [{"Rast": "worker1/Pumpe:ON!", "Temperatur": 0, "Dauer": 0,
                         "autonext": False, "extension": "retain"}]}
        value = import_recipe(raw)
        self.assertEqual(value["source"]["original"], raw)
        value["dock"].append(dict(value["steps"][0], id="parked"))
        result = export_plan(value)
        self.assertEqual(len(result["mash"]), 1)
        self.assertEqual(result["mash"][0]["Rast"], "worker1/Pumpe:ON!")
        self.assertEqual(result["misc"][0]["minh"], 1)
        self.assertEqual(result["misc"][0]["File"], "/Rezepte/Ähren.json")

    def test_mmum_boil_intervals_and_simultaneous_additions(self):
        raw = {"Rezeptquelle": "MMuM", "Maischform": "infusion", "Name": "Test",
               "Einmaischtemperatur": 60, "Rasten": [{"Temperatur": 63, "Zeit": 30}],
               "Kochzeit_Wuerze": 60, "Hopfenkochen": [
                   {"Sorte": "A", "Menge": 10, "Zeit": 45},
                   {"Sorte": "B", "Menge": 20, "Zeit": 10},
                   {"Sorte": "C", "Menge": 5, "Zeit": 10},
                   {"Sorte": "Ende", "Menge": 1, "Zeit": 0}]}
        value = import_recipe(raw)
        boiling = value["steps"][2:]
        self.assertEqual([s["Dauer"] for s in boiling], [15, 35, 10, 0])
        self.assertIn("B 20 g + C 5 g", boiling[2]["Rast"])
        self.assertEqual(sum(s["Dauer"] for s in boiling), 60)

    def test_brewfather_water_treatment_stays_only_in_source(self):
        water = [
            {"name": "Mash salt", "use": "Mash", "waterAdjustment": True},
            {"name": "Sparge acid", "use": "Sparge", "type": "Water Agent"},
            {"name": "Boil salt", "use": "Boil", "type": "Water Agent", "time": 10},
        ]
        recipe = {"name": "Water", "boilTime": 60, "mash": {"steps": []},
                  "hops": [{"name": "Dry hop", "use": "Dry Hop"}],
                  "miscs": water + [{"name": "Mash spice", "use": "Mash", "type": "Spice"},
                                    {"name": "Fining", "use": "Boil", "time": 10}]}
        value = import_recipe(recipe)
        self.assertEqual([s["Rast"] for s in value["dock"]], ["Dry hop", "Mash spice"])
        self.assertTrue(any("Fining" in s["Rast"] for s in value["steps"]))
        for item in water:
            self.assertFalse(any(item["name"] in s["Rast"] for s in value["steps"] + value["dock"]))
        self.assertEqual(value["source"]["original"], recipe)

    def test_brewfather_batch_and_dock(self):
        recipe = {"name": "Batch", "boilTime": 60, "mash": {"steps": [
            {"name": "Rast", "stepTime": 30, "stepTemp": 65, "type": "Decoction"}]},
            "hops": [{"name": "Cold", "use": "Dry Hop", "amount": 10, "time": 3}]}
        value = import_recipe({"recipe": recipe, "_id": "batch"})
        self.assertEqual(value["name"], "Batch")
        self.assertEqual(value["dock"][0]["Rast"], "Cold")
        self.assertIn("decoction_review", value["notices"])
        self.assertEqual(value["source"]["original"]["_id"], "batch")

    def test_draft_versions_legacy_update_and_delete(self):
        with tempfile.TemporaryDirectory() as root:
            store = DesignerStore(root)
            original = import_recipe({"misc": [{"Sudname": "Plan"}], "mash": []})
            store.write("draft-" + original["id"] + ".json", original)
            self.assertEqual(store.handle("list", {})[0]["version"], 1)
            second = store.handle("save", {"draft": original, "new_version": True})
            self.assertNotEqual(original["id"], second["id"])
            self.assertEqual(second["group_id"], original["id"])
            self.assertEqual(second["version"], 2)
            second["name"] = "Changed"
            updated = store.handle("save", {"draft": second})
            self.assertEqual(updated["id"], second["id"])
            self.assertEqual(updated["version"], 2)
            self.assertEqual(store.handle("load", {"id": original["id"]})["name"], "Plan")
            third = store.handle("save", {"draft": original, "new_version": True})
            self.assertEqual(third["version"], 3)
            store.handle("delete", {"id": original["id"]})
            self.assertEqual(len(store.handle("list", {})), 2)
            self.assertEqual(store.handle("load", {"id": second["id"]})["name"], "Changed")
            with self.assertRaises(ValueError):
                store.handle("delete", {"id": "../settings"})
            with self.assertRaises(FileNotFoundError):
                store.handle("delete", {"id": original["id"]})

    def test_draft_persistence_and_settings_redaction(self):
        with tempfile.TemporaryDirectory() as root:
            store = DesignerStore(root)
            value = import_recipe({"misc": [{"Sudname": "Test"}], "mash": []})
            value["dock"] = [{"id": "park", "Rast": "Pumpe:OFF", "Temperatur": 0, "Dauer": 0}]
            store.handle("save", {"draft": value})
            self.assertEqual(DesignerStore(root).handle("load", {"id": value["id"]})["dock"], value["dock"])
            settings = store.settings({"brewfather_user": "user", "brewfather_key": "secret", "kbh_path": "path"})
            self.assertNotIn("secret", json.dumps(settings))
            self.assertTrue(store.settings({"brewfather_key": ""})["key_saved"])
            self.assertFalse(store.settings({"clear_key": True})["key_saved"])
            for value in ("../settings", "..", "/settings.json"):
                with self.assertRaises(ValueError):
                    store.handle("load", {"id": value})

    def test_oversized_import_is_rejected_without_truncating_source(self):
        recipe = {"misc": [{}], "mash": [
            {"Rast": "Rast", "Temperatur": 65, "Dauer": 30} for _ in range(35)]}
        with self.assertRaisesRegex(ValueError, "30"):
            import_recipe(recipe)
        self.assertEqual(len(recipe["mash"]), 35)

    def test_offline_worker_keeps_resources_without_hiding_configuration_changes(self):
        with tempfile.TemporaryDirectory() as folder:
            store = DesignerStore(folder)
            config = {"misc": [{"multidevice": {"mode": 1}}]}
            worker = {"id": "w1", "host": "worker1", "actorsFresh": True,
                      "kettlesFresh": True, "actors": [{"name": "Pump", "slot": 0}],
                      "kettles": [{"name": "Sud", "slot": 1, "selected": True}],
                      "profiles": {"Sud.json": {"pname": "Sud"}}, "profilesFresh": True,
                      "sensors": [{"NAME": "SudSensor"}], "sensorsFresh": True,
                      "configuration": {"actors": [{"NAME": "Pump"}], "profiles": {"Sud.json": {}}}}
            def save(workers, master="master"):
                return store.handle("snapshot-save", {"profile": "one", "config": config,
                    "remote": {"master_id": master, "kettleRoles": [], "workers": workers}})
            save([worker])
            offline = save([{"id": "w1", "host": "worker1", "actors": [], "actorsFresh": False}])
            self.assertEqual(offline["remote"]["workers"][0]["actors"], worker["actors"])
            self.assertEqual(offline["remote"]["workers"][0]["kettles"], worker["kettles"])
            self.assertFalse(offline["remote_complete"])
            loaded = DesignerStore(folder).handle("snapshot-load", {"profile": "one"})
            cached = loaded["remote"]["workers"][0]
            self.assertEqual(cached["profiles"], worker["profiles"])
            self.assertEqual(cached["sensors"], worker["sensors"])
            self.assertEqual(cached["configuration"], worker["configuration"])
            self.assertFalse(cached["profilesFresh"])
            self.assertIsNone(DesignerStore(folder).handle("snapshot-load", {"profile": "another"}))
            cleared = save([dict(worker, actors=[])])
            self.assertEqual(cleared["remote"]["workers"][0]["actors"], [])
            replaced = save([{"id": "w1", "host": "worker1"}], "other-master")
            self.assertNotIn("actors", replaced["remote"]["workers"][0])
            removed = save([])
            self.assertEqual(removed["remote"]["workers"], [])

    def test_snapshot_excludes_wifi_and_api_secrets(self):
        value = snapshot({"misc": [{"ssid": "private", "password": "secret", "api": "token"}],
                          "actors": [{"NAME": "Pump", "URL": "http://secret"}], "kettles": []})
        self.assertNotIn("secret", json.dumps(value))
        self.assertFalse(value["complete"])

    def test_kbh_unc_uri_keeps_server_in_path(self):
        path = PureWindowsPath(r"\\NAS-Name\Bier Rezepte\kBh #1% & Grüße.sqlite")
        with patch("designer.Path") as path_class, patch("designer.sqlite3.connect") as connect:
            path_class.return_value.expanduser.return_value.resolve.return_value = path
            kbh_database(str(path))
            connect.assert_called_once_with(
                "file:////NAS-Name/Bier%20Rezepte/kBh%20%231%25%20%26%20Gr%C3%BC%C3%9Fe.sqlite?mode=ro",
                uri=True, timeout=2)

    def test_kbh_special_filename_and_read_only_connection(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "kBh #1% & Grüße.sqlite"
            with sqlite3.connect(path) as db:
                db.execute("CREATE TABLE example(value TEXT)")
                db.execute("INSERT INTO example VALUES ('unchanged')")
            db.close()
            original = path.read_bytes()
            connection = kbh_database(path)
            try:
                self.assertEqual(connection.execute("SELECT value FROM example").fetchone()[0], "unchanged")
                # Verify mode=ro, independently of the additional query_only guard.
                connection.execute("PRAGMA query_only=OFF")
                with self.assertRaisesRegex(sqlite3.OperationalError, "readonly"):
                    connection.execute("INSERT INTO example VALUES ('changed')")
            finally:
                connection.close()
            self.assertEqual(path.read_bytes(), original)

    def test_kbh_selection_is_read_only_and_ordered(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "kbh.sqlite"
            with sqlite3.connect(path) as db:
                db.executescript('''CREATE TABLE Sud(ID INTEGER PRIMARY KEY, Sudname TEXT, Kochdauer REAL, Status INTEGER DEFAULT 0, Sudnummer INTEGER, Braudatum TEXT, Erstellt TEXT, Gespeichert TEXT, MerklistenID INTEGER DEFAULT 0);
                    CREATE TABLE Maischplan(ID INTEGER PRIMARY KEY, SudID INTEGER, Name TEXT, Typ INTEGER, TempRast REAL, DauerRast REAL);
                    CREATE TABLE Hopfengaben(ID INTEGER PRIMARY KEY, SudID INTEGER, Name TEXT);
                    CREATE TABLE WeitereZutatenGaben(ID INTEGER PRIMARY KEY, SudID INTEGER, Name TEXT);
                    CREATE TABLE Global(db_Version INTEGER);
                    INSERT INTO Global VALUES(2009);
                    INSERT INTO Sud(ID,Sudname,Kochdauer) VALUES(1,'Alpha',0),(2,'Beta',0);
                    UPDATE Sud SET Gespeichert='2026-09-29T12:30:00', MerklistenID=7 WHERE ID=1;
                    INSERT INTO Maischplan VALUES(4,1,'Second',1,70,10),(2,1,'First',1,63,30),(5,2,'Other',1,60,1);''')
            db.close()
            original = path.read_bytes()
            entries = kbh_read(path)
            self.assertEqual(len(entries), 2)
            self.assertEqual(entries[1]["saved_at"], "2026-09-29T12:30:00")
            self.assertEqual(entries[1]["watchlist_id"], 7)
            self.assertEqual(entries[0]["watchlist_id"], 0)
            value = kbh_read(path, 1)
            self.assertEqual([r["Name"] for r in value["Maischplan"]], ["First", "Second"])
            self.assertNotIn("SudID", value["Maischplan"][0])
            self.assertEqual([s["Rast"] for s in import_recipe(value)["steps"]], ["First", "Second"])
            self.assertEqual(path.read_bytes(), original)

    def test_brewfather_cursor_and_read_scopes(self):
        with patch("designer.remote_json", return_value=[]) as remote:
            brewfather({"brewfather_user": "user", "brewfather_key": "key"}, "batches", cursor="a&b")
            self.assertIn("start_after=a%26b", remote.call_args.args[0])
            self.assertTrue(remote.call_args.args[1]["Authorization"].startswith("Basic "))
            self.assertNotIn("include=", remote.call_args.args[0])
            brewfather({"brewfather_user": "user", "brewfather_key": "key"}, cursor="r1")
            url = remote.call_args.args[0]
            self.assertIn("include=_created%2C_timestamp%2C_timestamp_ms%2CcreatedAt%2CupdatedAt", url)
            self.assertIn("start_after=r1", url)
            brewfather({"brewfather_user": "user", "brewfather_key": "key"}, item_id="r1")
            self.assertEqual(remote.call_args.args[0], "https://api.brewfather.app/v2/recipes/r1")
            with self.assertRaises(ValueError):
                brewfather({}, "../../other")

    def test_unrelated_json_is_not_a_recipe(self):
        for value in ({"config": {}}, [{"name": "unrelated"}], [], {"mash": [{"name": "unrelated"}]}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                import_recipe(value)

    def test_invalid_json_numbers_and_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            import_recipe({"misc": [{}], "mash": [{"Rast": "Rast", "Temperatur": float("nan")}]})
        value = import_recipe({"misc": [{}], "mash": [{"Rast": "Rast"}]})
        value["dock"] = value["steps"][:]
        with self.assertRaises(ValueError):
            export_plan(value)


if __name__ == "__main__":
    unittest.main()
