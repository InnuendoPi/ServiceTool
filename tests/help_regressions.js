const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const helpSource = fs.readFileSync('static/help.js', 'utf8');
const books = Object.fromEntries(['de','en'].map(lang => [lang, fs.readFileSync(`static/help/${lang}.md`, 'utf8')]));

function helpContext(fetch) {
  const nodes = {};
  function element() {
    return {value:'',textContent:'',innerHTML:'',children:[],attrs:{},listeners:{},dataset:{},scrollTop:10,
      classList:{remove(){},add(){}},
      replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},
      setAttribute(key,value){this.attrs[key]=value;},addEventListener(key,handler){this.listeners[key]=handler;},
      focus(){this.focused=true;}};
  }
  const ctx = vm.createContext({currentLang:'de',fetch,document:{
    getElementById:id=>nodes[id] ||= element(),createElement:element,
    querySelector:()=>nodes.reading ||= element()}});
  vm.runInContext(helpSource,ctx);
  return {ctx,nodes,run:code=>vm.runInContext(code,ctx)};
}

(async () => {
  let requests=0;
  const {ctx,nodes,run} = helpContext(async url => {
    requests++;
    assert.equal(url,'/help/de.md');
    return {ok:true,text:async()=>books.de};
  });
  for (const language of ['de','en']) {
    ctx.markdown=books[language];
    const chapters=run('parseGuideBook(markdown)');
    assert.equal(chapters.length,8);
    assert.equal(new Set(chapters.map(c=>c.id)).size,8);
    assert.ok(chapters.every(c=>c.title && c.body.trim()));
    for (const chapter of chapters) {
      ctx.markdown=chapter.body;
      const rendered=run('guideMarkdown(markdown)');
      assert.equal((rendered.match(/<details>/g)||[]).length,(rendered.match(/<\/details>/g)||[]).length);
    }
  }
  assert.throws(()=>run('parseGuideBook("# Incomplete\\nOnly one chapter")'),/Invalid help book/);
  ctx.markdown='## Title\n1. First\n2. Second\n\n- Item\n\n:::details Background\n**Bold** and `code`\n:::\n<script>alert(1)</script>\n[Migration](#migration)\n[Bad](javascript:alert(1))';
  const rendered=run('guideMarkdown(markdown)');
  assert.match(rendered,/<ol><li>First<\/li><li>Second<\/li><\/ol>/);
  assert.match(rendered,/<details><summary>Background<\/summary>/);
  assert.match(rendered,/<strong>Bold<\/strong>/);
  assert.match(rendered,/<code>code<\/code>/);
  assert.ok(!rendered.includes('<script>'));
  assert.ok(!rendered.includes('href="javascript:'));
  assert.match(rendered,/data-guide-chapter="migration"/);
  ctx.markdown='### Wrapped text\n\nA paragraph with\na soft line break.\n\n1. A list item with\n   a continuation.\n2. Another item.';
  const wrapped=run('guideMarkdown(markdown)');
  assert.match(wrapped,/<p>A paragraph with a soft line break\.<\/p>/);
  assert.match(wrapped,/<li>A list item with a continuation\.<\/li>/);
  assert.match(wrapped,/<h3>Wrapped text<\/h3>/);

  await run('loadGuideBook()');
  assert.equal(nodes.guideChapters.children.length,8);
  assert.match(run('guideInline("[Geräte](#geräte--wlan)")'),/data-guide-chapter="devices"/);
  assert.match(run('guideInline("[Einstellungen](#einstellungen)")'),/data-guide-chapter="settings"/);
  nodes.guideSearch.value='FLASH-SICHERUNG';
  run('renderGuideBook()');
  assert.equal(nodes.guideChapters.children.length,1);
  assert.equal(nodes.guideChapters.children[0].textContent,'Migration');
  nodes.guideChapters.children[0].listeners.click();
  assert.match(nodes.guideContent.innerHTML,/<h2>Migration<\/h2>/);
  assert.equal(nodes.guideContent.focused,true);
  assert.equal(nodes.reading.scrollTop,0);
  nodes.guideSearch.value='does-not-exist-1234';
  run('renderGuideBook()');
  assert.equal(nodes.guideChapters.children.length,0);
  assert.equal(nodes.guideSearchStatus.textContent,'0 Kapitel gefunden');
  nodes.guideSearch.value='';
  await run('loadGuideBook()');
  assert.equal(requests,1, 'help uses its local in-memory cache');
  ctx.workspaceView='settings';
  run('openGuideBook()');
  assert.match(nodes.guideContent.innerHTML,/<h2>Einstellungen<\/h2>/);
  assert.equal(nodes.guideSearch.focused,true);
  run('closeGuideBook()');
  assert.equal(nodes.workspaceMenuToggle.focused,true);

  ctx.currentLang='en';
  ctx.fetch=async()=>({ok:false,status:404});
  await run('loadGuideBook()');
  assert.match(nodes.guideContent.textContent,/could not be loaded/);
  assert.equal(nodes.guideChapters.children.length,0);
  assert.equal(nodes.guideContent.children.at(-1).textContent,'Retry');
  ctx.fetch=async()=>({ok:true,text:async()=>books.en});
  await nodes.guideContent.children.at(-1).listeners.click();
  assert.equal(nodes.guideChapters.children.length,8);
  assert.match(nodes.guideContent.innerHTML,/<h2>Settings<\/h2>/);

  let rejectOld;
  const delayed=new Promise((resolve,reject)=>{rejectOld=reject;});
  const race=helpContext(()=>delayed);
  const first=race.run('loadGuideBook()');
  race.ctx.currentLang='en';
  race.ctx.fetch=async()=>({ok:true,text:async()=>books.en});
  await race.run('loadGuideBook()');
  rejectOld(new Error('old request failed')); await first;
  assert.match(race.nodes.guideContent.innerHTML,/<h2>Getting started<\/h2>/);
  console.log('Help: both books, search, navigation, context, escaping, cache, retry and stale requests verified');
})().catch(error=>{console.error(error);process.exitCode=1;});
