self.addEventListener('push',e=>{const d=e.data?e.data.json():{title:'Desk'};e.waitUntil(self.registration.showNotification(d.title,{body:d.body,tag:d.tag,data:{url:d.url},
actions:(d.buttons||[]).filter(b=>b.url).slice(0,2).map((b,i)=>({action:'u'+i,title:b.label}))}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(e.notification.data.url||'/'))});
