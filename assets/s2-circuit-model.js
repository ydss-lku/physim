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
    const lamps = [], power = {};
    for (const edge of slots) {
      const p=parts[edge.id];
      if (!p) continue;
      if (p.type==='wire' || (p.type==='switch' && p.closed)) parent[root(edge.a)]=root(edge.b);
      if (p.type==='cell') cell=edge;
      if (p.type==='bulb') {
        power[edge.id]=0;
        if (p.fitted) lamps.push(edge);
      }
    }
    const result={power, state:'noCell', lit:0, total:Object.keys(power).length};
    if (!cell) return result;
    const neg=root(cell.a), pos=root(cell.b);
    if (neg===pos) {result.state='short'; return result;}
    const neighbours=Array.from({length:12},()=>[]);
    for (const e of lamps) {
      const a=root(e.a), b=root(e.b);
      if (a!==b) {neighbours[a].push(b); neighbours[b].push(a);}
    }
    const reachable=new Set([neg,pos]);
    for (const node of reachable) for (const next of neighbours[node]) reachable.add(next);
    const unknown=[...reachable].filter(n=>n!==pos && n!==neg);
    const matrix=unknown.map((n,i)=>{
      const row=Array(unknown.length+1).fill(0);
      row[i]=neighbours[n].length;
      for (const other of neighbours[n]) {
        if (other===pos) row[unknown.length]++;
        else if (other!==neg) row[unknown.indexOf(other)]--;
      }
      return row;
    });
    const solution=potentials(matrix);
    const volts=new Map([[neg,0],[pos,1]]);
    unknown.forEach((n,i)=>volts.set(n,solution[i]));
    for (const e of lamps) {
      const drop=(volts.get(root(e.a))??0)-(volts.get(root(e.b))??0);
      if (Math.abs(drop)>1e-8) {power[e.id]=drop*drop; result.lit++;}
    }
    result.state=result.lit?'closed':'open';
    return result;
  }
  return {slots,preset,solve};
})();
