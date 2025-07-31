// 清理 Service Worker 的脚本
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    console.log('🧹 开始清理 Service Worker...');
    
    for(let registration of registrations) {
      console.log('🗑️ 注销 Service Worker:', registration.scope);
      registration.unregister().then(function(boolean) {
        console.log('✅ Service Worker 注销', boolean ? '成功' : '失败');
      });
    }
    
    // 清理所有缓存
    if ('caches' in window) {
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            console.log('🗑️ 删除缓存:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(function() {
        console.log('✅ 所有缓存已清理');
        alert('Service Worker 和缓存已清理完成！请刷新页面。');
        window.location.reload();
      });
    } else {
      alert('Service Worker 已清理完成！请刷新页面。');
      window.location.reload();
    }
  });
} else {
  console.log('❌ 浏览器不支持 Service Worker');
  alert('浏览器不支持 Service Worker，请手动清理浏览器缓存。');
}