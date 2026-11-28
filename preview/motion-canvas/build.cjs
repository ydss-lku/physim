const {build}=require('esbuild');
const fs=require('node:fs');
const path=require('node:path');
async function bundle(){
  const result=await build({entryPoints:['scene.js'],outfile:'scene.bundle.js',bundle:true,minify:true,format:'iife',
    metafile:true,loader:{'.glsl':'text','.svg':'text'},define:{'import.meta.hot':'false'}});
  const packages=new Set();
  for(const input of Object.keys(result.metafile.inputs)){
    if(!input.includes('node_modules/'))continue;
    let dir=path.dirname(input);
    while(dir!=='.'&&!fs.existsSync(path.join(dir,'package.json')))dir=path.dirname(dir);
    packages.add(dir);
  }
  const notices=[];
  for(const dir of [...packages].sort()){
    const license=fs.readdirSync(dir).find(file=>/^licen[sc]e(?:[.]|$)/i.test(file));
    if(license)notices.push(dir+'\n'+fs.readFileSync(path.join(dir,license),'utf8'));
  }
  fs.writeFileSync('licenses.txt',notices.join('\n\n'));
}
bundle().catch(error=>{console.error(error);process.exitCode=1});
