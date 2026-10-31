/* Read-only summary of explicit plan marks across every calendar month. */
(function(root){
  function validDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    var year=Number(value.slice(0,4)),month=Number(value.slice(5,7)),day=Number(value.slice(8,10));
    var date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }
  function publicationSchedule(channel,marks,today,isPausedOn){
    if(isPausedOn(channel,today))return {paused:true,next:null,overdue:null};
    var plans=Object.keys(marks||{}).filter(function(day){
      return marks[day]==='plan'&&validDate(day)&&(!channel.start||day>=channel.start)&&!isPausedOn(channel,day);
    }).sort();
    return {paused:false,next:plans.find(function(day){return day>=today;})||null,
      overdue:plans.find(function(day){return day<today;})||null};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=publicationSchedule;
  else root.publicationSchedule=publicationSchedule;
})(typeof globalThis!=='undefined'?globalThis:this);
