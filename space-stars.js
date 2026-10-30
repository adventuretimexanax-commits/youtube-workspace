/* Decorative foreground stars only. The real Hubble photograph stays a static CSS layer.
   No WebGL, no backdrop filters, no per-frame allocations or data access. */
(function () {
  'use strict';
  var canvas = document.getElementById('space-stars');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var w=1,h=1,dpr=1,frame=0,last=0,elapsed=0,scrollTimer=0,scrolling=false;
  var stars=[],sprites=[],seed=41893;
  function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  // Cached optical point-spread sprites, with different spectral tint and faint spikes.
  ['211,225,255','255,244,216','236,242,255','207,233,247'].forEach(function(color){
    var sprite=document.createElement('canvas');sprite.width=sprite.height=48;
    var c=sprite.getContext('2d'),g=c.createRadialGradient(24,24,0,24,24,22);
    g.addColorStop(0,'rgba('+color+',.95)');g.addColorStop(.045,'rgba('+color+',.8)');
    g.addColorStop(.12,'rgba('+color+',.22)');g.addColorStop(.32,'rgba('+color+',.04)');g.addColorStop(1,'rgba('+color+',0)');
    c.fillStyle=g;c.fillRect(0,0,48,48);
    c.strokeStyle='rgba('+color+',.13)';c.lineWidth=.6;c.beginPath();c.moveTo(24,13);c.lineTo(24,35);c.moveTo(13,24);c.lineTo(35,24);c.stroke();
    sprites.push(sprite);
  });
  for(var i=0;i<42;i++)stars.push({x:random(),y:random(),depth:.22+random()*.78,size:2.5+random()*6,tint:i%4,phase:random()*6.28});
  function draw(dt){
    elapsed+=dt;ctx.clearRect(0,0,w,h);
    stars.forEach(function(star){
      var x=(star.x*w+elapsed*(.16+star.depth*.28))%(w+24)-12;
      var y=(star.y*h-elapsed*(.035+star.depth*.09)+h+24)%(h+24)-12;
      var size=star.size*(.65+star.depth*.6);
      // Only a few large near stars are bright; most stay in the background.
      ctx.globalAlpha=(.22+star.depth*.38)*(reduced.matches?1:.94+.06*Math.sin(elapsed*.18+star.phase));
      ctx.drawImage(sprites[star.tint],x-size/2,y-size/2,size,size);
    });ctx.globalAlpha=1;
  }
  function resize(){
    w=innerWidth;h=innerHeight;
    dpr=Math.min(devicePixelRatio||1,1.25,Math.sqrt(3000000/Math.max(1,w*h)));
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw(0);
  }
  function tick(now){
    frame=0;if(document.hidden||reduced.matches||scrolling)return;
    if(now-last>=1000/20){draw(Math.min((now-last)/1000,.15));last=now;}
    frame=requestAnimationFrame(tick);
  }
  function start(){
    if(frame)cancelAnimationFrame(frame);frame=0;last=performance.now();
    if(document.hidden||scrolling)return;
    if(reduced.matches){draw(0);return;}frame=requestAnimationFrame(tick);
  }
  addEventListener('resize',function(){resize();start();},{passive:true});
  addEventListener('scroll',function(){
    scrolling=true;if(frame)cancelAnimationFrame(frame);frame=0;
    clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){scrolling=false;start();},180);
  },{passive:true});
  document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
  resize();start();
})();
