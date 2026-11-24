const pairs=[
['回復視角','Restore view'],
['顯示控制欄','Show controls'],['收起控制欄','Hide controls'],
['全螢幕','Full screen'],['退出全螢幕','Exit full screen'],
['建議打橫手機，睇清楚成套蒸餾裝置。','Turn your phone sideways to see the whole setup.'],['收起橫屏提示','Dismiss landscape tip'],
['放大','Zoom in'],['縮細','Zoom out'],
['海水蒸餾實驗','Seawater distillation'],['中一科學 · 分離混合物','S1 Science · Separating mixtures'],['科學老師','Science teacher'],['枱面俯視','Bench surface'],['拖動抹布，或用方向鍵移動','Drag the cloth or use the arrow keys'],['三維蒸餾裝置，可拖動改變視角','Distillation apparatus. Drag to rotate.'],
['枱面抹乾喇，檢查喉頭，改好接駁先再開水。','Bench dry. Check the hoses before opening a tap.'],['點喉頭或接口開始接駁。','Select a hose end or a port.'],['點喉頭（取消）','Select a hose end'],['點接口（取消）','Select a port'],['取消選擇','Cancel selection'],['：由洗手盆拎返上去',' · lift out of the sink'],['拎返上去','Lift out'],['鬆開','Disconnect'],['未接','free'],['青喉','Teal hose'],['啡喉','Brown hose'],['燒瓶端（高位）','upper port'],['接收器端（低位）','lower port'],['水龍頭','water tap'],['洗手盆','sink'],
['防暴沸粒：有','Boiling chips: on'],['防暴沸粒：冇','Boiling chips: off'],['加入海水','Add seawater'],['重新開始','Restart'],['接駁膠喉','Connect hoses'],['隱藏標籤','Hide port labels'],['顯示標籤','Show port labels'],['隱藏器材英文全名','Hide apparatus names'],['顯示器材英文全名','Show apparatus names'],['器材英文全名','English apparatus names'],['除低熱像眼鏡','Remove thermal goggles'],['戴上熱像眼鏡','Wear thermal goggles'],['第一身 · 熱像眼鏡','Thermal goggles'],['實驗枱','Lab bench'],['回復正常速度','Normal speed'],['快轉八倍','Fast forward 8×'],['熄火','Turn off burner'],['開火','Light burner'],['收集到嘅蒸餾水　','Distillate　'],['溫度計　','Thermometer　'],['較冷','Cool'],['較熱','Hot'],['模擬熱像','Thermal view']];
function labText(raw){
 if(document.documentElement.dataset.language!=='en'||!/[\u3400-\u9fff]/.test(raw))return raw;
 let value=raw.replace(/閂 (T[12])/g,'Close $1').replace(/開 (T[12])/g,'Open $1');
 for(const [zh,en] of pairs)if(value.includes(zh))value=value.replaceAll(zh,en);
 return value;
}

const teacherLines = {
  leak: ["同學！唔准浪費食水!","Don't waste water!"],
  otherTap: ["同學！閂埋另一個水龍頭呀！唔准浪費食水!","Turn off the other tap too! Don't waste water!"],
  blocked: ["同學！檢查清楚你啲水喉接駁！","Take a good look at those hose connections!"],
  flame: ["同學小心啊！不如熄火先啦！","Careful there! Let's turn off the burner first!"],
  wipe: ["同學！抹返乾淨張枱先繼續！","Wipe the bench dry before you carry on!"],
  empty: ["同學！你未落海水喎！快啲熄火！你就嚟燒爛個 flask 啦！","You haven't added the seawater! Turn off the burner! You're about to crack the flask!"],
  almostDry: ["同學！啲海水就快俾你蒸乾喇！快啲熄火！","You're about to boil the flask dry! Turn off the burner!"],
  noWater: ["同學！冷凝管未有水喎！","There's no cooling water flowing through the condenser!"],
  bumping: ["同學小心啊！啲海水暴沸喇！不如熄火先啦！","Careful! The seawater is bumping! Let's turn off the burner first!"],
  loop: ["同學！喺實驗室唔准玩水！如果你再玩水，培育組老師會同你跟進一下！","No playing with water in the lab! If you do it again, the PC Team will follow up with you!"],
  hotReverse: ["同學！熄咗火、攤返凍，先好掹走啲喉呀！","Turn off the burner and let the apparatus cool before you pull off the hoses!"],
  waste: ["同學！唔准浪費食水!","Don't waste water!"],
  reverseOn: ["同學，你而家嘅接駁方法唔啱啊！應該係下面入水，上面出水！你依家閂咗水喉先啦！","You've got the hoses the wrong way round! Water goes in at the bottom and out at the top. Turn off the tap first!"],
  reverseOff: ["供水喉要駁下面！","Connect the supply hose to the lower port!"]
};
function teacherLine(key, tap = "") {
  const english = document.documentElement.dataset.language === "en";
  return teacherLines[key][english ? 1 : 0].replace("{tap}", tap);
}
