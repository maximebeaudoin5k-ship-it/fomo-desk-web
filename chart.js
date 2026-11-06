function drawChart(cv,prices,stopLine){const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);if(!prices.length)return;
const ys=prices.map(p=>p.price).filter(x=>x!=null);if(stopLine)ys.push(stopLine);const lo=Math.min(...ys),hi=Math.max(...ys)||1,
Y=v=>cv.height-10-(v-lo)/((hi-lo)||1)*(cv.height-20),X=i=>i/(prices.length-1||1)*cv.width;
c.strokeStyle='#0a84ff';c.lineWidth=2;c.beginPath();prices.forEach((p,i)=>i?c.lineTo(X(i),Y(p.price)):c.moveTo(X(i),Y(p.price)));c.stroke();
if(stopLine){c.setLineDash([6,4]);c.strokeStyle='#ff9f0a';c.beginPath();c.moveTo(0,Y(stopLine));c.lineTo(cv.width,Y(stopLine));c.stroke();c.setLineDash([]);c.fillStyle='#ff9f0a';c.fillText('Risk trailing stop',4,Y(stopLine)-4)}}
