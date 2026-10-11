/* Keep the site's address and close action in sync with the supplied viewer. */
(() => {
  let previous;
  function publish() {
    const slug = location.hash.replace(/^#\//, '').replace(/\/$/, '');
    if (slug === previous || !/^[a-z0-9-]*$/.test(slug)) return;
    previous = slug;
    if (parent !== window) parent.postMessage({type: 'lookbook-route', slug}, location.origin);
  }
  window.addEventListener('hashchange', publish);
  new MutationObserver(publish).observe(document.documentElement, {childList:true, subtree:true});
  publish();
})();
