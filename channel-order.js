/* Pure ordering: replace only positions belonging to the same pause group. */
(function(root){
  function reorder(channels,sourceId,targetId,after,isPaused){
    var source=channels.find(function(c){return c.id===sourceId;}),target=channels.find(function(c){return c.id===targetId;});
    if(!source||!target||source===target||isPaused(source)!==isPaused(target))return channels;
    var group=channels.filter(function(c){return isPaused(c)===isPaused(source);});
    group.splice(group.indexOf(source),1);
    group.splice(group.indexOf(target)+(after?1:0),0,source);
    var i=0;
    return channels.map(function(c){return isPaused(c)===isPaused(source)?group[i++]:c;});
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=reorder;
  else root.reorderChannelGroup=reorder;
})(typeof globalThis!=='undefined'?globalThis:this);
