/* Ideal cell and conductors; identical fixed-resistance bulbs. Brightness follows
   electrical power, relative to one bulb connected directly across the cell. */
const CircuitBoardModel = (() => {
  const slots = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const node = row * 4 + col;
      if (col < 3) slots.push({id: 'h'+row+col, a: node, b: node+1});
      if (row < 2) slots.push({id: 'v'+row+col, a: node, b: node+4});
    }
  }
  function preset(name) {
    const parts = {};
    if (name === 'empty') return parts;
    for (const id of ['h00','h02','v03','h10','h12']) parts[id] = {type:'wire'};
    parts.h01 = {type:'cell'};
    parts.v00 = {type:'switch', closed:false};
    parts.h11 = {type:'bulb', fitted:true};
    if (name === 'series') parts.h10 = {type:'bulb', fitted:true};
    if (name === 'parallel') {
      for (const id of ['v10','v13','h20','h22']) parts[id] = {type:'wire'};
      parts.h21 = {type:'bulb', fitted:true};
    }
    return parts;
  }
  // Only nodes that are electrically connected to a cell terminal enter this system.
  // Their fixed terminal potentials make the reduced conductance matrix positive definite.
  function potentials(matrix) {
    const n = matrix.length;
    for (let i=0; i<n; i++) {
      const pivot = matrix[i][i];
      for (let c=i; c<=n; c++) matrix[i][c] /= pivot;
      for (let r=0; r<n; r++) {
        if (r===i) continue;
        const scale = matrix[r][i];
        for (let c=i; c<=n; c++) matrix[r][c] -= scale * matrix[i][c];
      }
    }
    return matrix.map(row => row[n]);
  }
  function solve(parts) {
    const parent = Array.from({length:12}, (_,i) => i);
    function root(n) { while (parent[n]!==n) n=parent[n]; return n; }
    let cell;
    const loads = [], conductors = [], power = {};
    for (const edge of slots) {
      const p=parts[edge.id];
      if (!p) continue;
      if (p.type==='wire' || p.type==='ammeter' || (p.type==='switch' && p.closed)) {
        parent[root(edge.a)]=root(edge.b);
        conductors.push(edge);
      }
      // Conductance relative to a 10-ohm model bulb.
      if (p.type==='resistor') loads.push({...edge,g:10/p.ohms});
      if (p.type==='cell') cell=edge;
      if (p.type==='bulb') {
        power[edge.id]=0;
        if (p.fitted) loads.push({...edge,g:1});
      }
    }
    const active=new Map(), injection=Array(12).fill(0);
    const amps={}, voltage={};
    const result={power, amps, voltage, active, state:'noCell', lit:0, total:Object.keys(power).length};
    for(const {id} of slots){
      if(parts[id]?.type==='ammeter') amps[id]=0;
      if(parts[id]?.type==='voltmeter'||parts[id]?.voltmeter) voltage[id]=null;
    }
    if (!cell) return result;
    const neg=root(cell.a), pos=root(cell.b);
    // Resolve current sharing inside ideal-wire loops as the limit of equal,
    // vanishing resistance per conductor. Ground one post per connected group.
    function trace(sourceCurrent) {
      active.set(cell.id,1);
      injection[cell.b]+=sourceCurrent;
      injection[cell.a]-=sourceCurrent;
      const nodes=parent.map((_,n)=>n).filter(n=>root(n)!==n);
      const matrix=nodes.map(n=>{
        const row=Array(nodes.length+1).fill(0);
        for(const {a,b} of conductors) {
          if(a!==n && b!==n) continue;
          row[nodes.indexOf(n)]++;
          const j=nodes.indexOf(a===n?b:a);
          if(j>=0) row[j]--;
        }
        row[nodes.length]=injection[n];
        return row;
      });
      const values=potentials(matrix);
      const level=n=>values[nodes.indexOf(n)]??0;
      for(const edge of conductors) {
        const drop=level(edge.a)-level(edge.b);
        if(parts[edge.id].type==='ammeter') amps[edge.id]=result.state==='short'?null:Math.abs(drop)*0.15;
        if(Math.abs(drop)>1e-8) active.set(edge.id,Math.sign(drop));
      }
    }
    if (neg===pos) {result.state='short'; trace(1); return result;}
    const neighbours=Array.from({length:12},()=>[]);
    for (const e of loads) {
      const a=root(e.a), b=root(e.b);
      if (a!==b) {neighbours[a].push([b,e.g]); neighbours[b].push([a,e.g]);}
    }
    const reachable=new Set([neg,pos]);
    for (const node of reachable) for (const [next] of neighbours[node]) reachable.add(next);
    const unknown=[...reachable].filter(n=>n!==pos && n!==neg);
    const matrix=unknown.map((n,i)=>{
      const row=Array(unknown.length+1).fill(0);
      
      for (const [other,g] of neighbours[n]) {
        row[i]+=g;
        if (other===pos) row[unknown.length]+=g;
        else if (other!==neg) row[unknown.indexOf(other)]-=g;
      }
      return row;
    });
    const solution=potentials(matrix);
    const volts=new Map([[neg,0],[pos,1]]);
    unknown.forEach((n,i)=>volts.set(n,solution[i]));
    for(const {id,a,b} of slots){
      if(!(id in voltage)) continue;
      const left=root(a),right=root(b);
      if(left===right) voltage[id]=0;
      else if(volts.has(left)&&volts.has(right)) voltage[id]=1.5*Math.abs(volts.get(left)-volts.get(right));
    }
    for (const e of loads) {
      const drop=(volts.get(root(e.a))??0)-(volts.get(root(e.b))??0);
      if (Math.abs(drop)>1e-8) {
        if(parts[e.id].type==='bulb'){power[e.id]=drop*drop; result.lit++;}
        active.set(e.id,Math.sign(drop));
        injection[e.a]-=drop*e.g;
        injection[e.b]+=drop*e.g;
      }
    }
    result.state=active.size?'closed':'open';
    if(active.size) trace(-injection.reduce((sum,i,n)=>sum+(root(n)===pos?i:0),0));
    return result;
  }
  return {slots,preset,solve};
})();
