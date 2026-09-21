/** FOUC-safe theme bootstrap — keep this file free of "use client". */
export const THEME_STORAGE_KEY = "scrapbook-theme";

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#16121c':'#fff8ef');}catch(e){}})();`;
