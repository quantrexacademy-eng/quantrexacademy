const m = require('./data/qx_local_fig_map.json');
let count = 0;
for (let k in m) {
  if (k.includes('qx-book')) count++;
  if (k.includes('8d50ab2bb312bc7c')) console.log('Found hash:', k, '->', m[k]);
}
console.log('Total qx-book keys:', count);
