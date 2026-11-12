(function () {
  'use strict';
  var data = JSON.parse(document.getElementById('kb-data').textContent);
  var categories = data.categories;
  var entries = data.entries;
  var bySlug = {};
  var byCat = {};
  categories.forEach(function (c) { byCat[c.slug] = []; });
  entries.forEach(function (e) {
    bySlug[e.slug] = e;
    (byCat[e.category] = byCat[e.category] || []).push(e);
    e._t = e.title.toLowerCase();
    e._g = e.tags.join(' ');
    e._s = e.summary.toLowerCase();
    e._x = e.text.toLowerCase();
  });
  var catName = {};
  categories.forEach(function (c) { catName[c.slug] = c.name; });

  var TYPE_LABEL = { topic: 'Topics', guidance: 'Guidance and frameworks', person: 'People', source: 'Sources' };
  var STATUS_CLASS = {
    'Statutory guidance': 'must', 'Legislation': 'must', 'Non-statutory guidance': 'should',
    'Inspection framework': 'inspect', 'Evidence summary': 'evidence', 'Research and theory': 'evidence',
    'Thinker profile': 'person'
  };
  var ASKS = ['marking and feedback', 'behaviour management strategies', 'persistent absence', 'KCSIE',
    'Ofsted report card', 'retrieval practice', 'pupil premium', 'adaptive teaching', 'Paul Dix', 'Bill Rogers',
    'Tom Sherrington', 'Mary Myatt'];

  var main = document.getElementById('main');
  var nav = document.getElementById('areas');
  var input = document.getElementById('q');
  var clearBtn = document.getElementById('q-clear');
  var state = { query: '', type: 'all', lastQuery: '' };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function tokens(q) {
    return q.toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
  }
  function highlight(text, toks) {
    var out = esc(text);
    if (!toks.length) return out;
    var re = new RegExp('(' + toks.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return iso || '';
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ' ' + m[1];
  }

  function search(q) {
    var toks = tokens(q);
    if (!toks.length) return [];
    var phrase = q.toLowerCase().trim();
    var scored = [];
    entries.forEach(function (e) {
      var score = 0, hits = 0;
      toks.forEach(function (t) {
        var s = 0;
        var i = e._t.indexOf(t);
        if (i >= 0) s += (i === 0 || /[^a-z0-9]/.test(e._t.charAt(i - 1))) ? 14 : 8;
        if (e._g.indexOf(t) >= 0) s += 6;
        if (e._s.indexOf(t) >= 0) s += 4;
        var n = e._x.split(t).length - 1;
        if (n) s += Math.min(n, 6) * 0.5;
        if (s) hits++;
        score += s;
      });
      if (!hits) return;
      if (e._t === phrase) score += 40;
      else if (e._t.indexOf(phrase) >= 0) score += 15;
      if (toks.length > 1 && e._x.indexOf(phrase) >= 0) score += 5;
      scored.push({ e: e, score: score, all: hits === toks.length });
    });
    var all = scored.filter(function (r) { return r.all; });
    var use = all.length ? all : scored;
    use.sort(function (a, b) { return b.score - a.score || a.e.title.localeCompare(b.e.title); });
    return use.map(function (r) { return r.e; });
  }

  function pill(e) {
    return '<span class="pill ' + (STATUS_CLASS[e.status] || '') + '">' + esc(e.status) + '</span>';
  }
  function row(e, toks, showCat) {
    return '<li><a class="row" href="#' + e.slug + '"><h3>' + highlight(e.title, toks) + '</h3><p>' +
      highlight(e.summary, toks) + '</p><div class="meta">' + pill(e) +
      (showCat ? '<span>' + esc(catName[e.category] || '') + '</span>' : '') + '</div></a></li>';
  }
  function typeChips(list) {
    var present = {};
    list.forEach(function (e) { present[e.type] = (present[e.type] || 0) + 1; });
    var types = Object.keys(TYPE_LABEL).filter(function (t) { return present[t]; });
    if (types.length < 2) { state.type = 'all'; return ''; }
    if (state.type !== 'all' && !present[state.type]) state.type = 'all';
    var html = '<div class="chips" role="group" aria-label="Filter by type">' +
      '<button type="button" data-type="all" aria-pressed="' + (state.type === 'all') + '">All ' + list.length + '</button>';
    types.forEach(function (t) {
      html += '<button type="button" data-type="' + t + '" aria-pressed="' + (state.type === t) + '">' +
        TYPE_LABEL[t] + ' ' + present[t] + '</button>';
    });
    return html + '</div>';
  }
  function filtered(list) {
    return state.type === 'all' ? list : list.filter(function (e) { return e.type === state.type; });
  }

  function viewHome() {
    var html = '<section class="lede"><h1>What does the evidence, the guidance and the law say?</h1>' +
      '<p>' + entries.length + ' sourced summaries on secondary education in England: classroom practice, behaviour, ' +
      'attendance, safeguarding, curriculum, inspection and the people whose ideas shape them. Search above, or try one of these.</p>' +
      '<ul class="asks">' + ASKS.map(function (a) {
        return '<li><button type="button" data-ask="' + esc(a) + '">' + esc(a) + '</button></li>';
      }).join('') + '</ul></section>';
    html += '<h2 class="label">Browse by area</h2><div class="grid">';
    categories.forEach(function (c) {
      var n = (byCat[c.slug] || []).length;
      if (!n) return;
      html += '<a class="area-card" href="#cat-' + c.slug + '"><h2>' + esc(c.name) + '</h2><p>' + esc(c.blurb) +
        '</p><span class="n">' + n + (n === 1 ? ' entry' : ' entries') + '</span></a>';
    });
    main.innerHTML = html + '</div>';
    document.title = 'Staffroom Reference';
  }

  function viewCategory(c) {
    var list = byCat[c.slug] || [];
    var chips = typeChips(list);
    var shown = filtered(list);
    main.innerHTML = '<div class="head"><h1>' + esc(c.name) + '</h1><p>' + esc(c.blurb) + '</p></div>' + chips +
      '<ul class="rows">' + shown.map(function (e) { return row(e, [], false); }).join('') + '</ul>';
    document.title = c.name + ' · Staffroom Reference';
  }

  function viewResults() {
    var toks = tokens(state.query);
    var list = search(state.query);
    var chips = typeChips(list);
    var shown = filtered(list);
    var html = '<div class="head"><h1>' + (list.length ? list.length + (list.length === 1 ? ' result' : ' results') : 'No results') +
      ' for “' + esc(state.query.trim()) + '”</h1></div>';
    if (!list.length) {
      html += '<p class="empty">Nothing matches that. Try a shorter or more general term, for example “feedback” instead of ' +
        '“feedback policy for Year 9”, or browse the areas.</p>';
    } else {
      html += chips + '<ul class="rows">' + shown.map(function (e) { return row(e, toks, true); }).join('') + '</ul>';
    }
    main.innerHTML = html;
  }

  function viewEntry(e) {
    var html = '<article class="entry"><div class="crumb"><a href="#cat-' + e.category + '">' + esc(catName[e.category] || 'Area') + '</a>';
    if (state.lastQuery) html += '<a href="#home" data-back="1">Back to results for “' + esc(state.lastQuery) + '”</a>';
    html += '</div><h1>' + esc(e.title) + '</h1><div class="meta">' + pill(e) +
      (e.checked ? '<span>Checked ' + esc(fmtDate(e.checked)) + '</span>' : '') + '</div>' +
      '<p class="summary">' + esc(e.summary) + '</p>';
    if (e.evidence) html += '<p class="evidence"><b>Evidence rating:</b> ' + esc(e.evidence) + '</p>';
    html += '<div class="prose">' + e.html;
    if (e.sources.length) {
      html += '<h2>Sources</h2><ol class="srcs">' + e.sources.map(function (s) {
        var label = esc(s.title);
        var bits = [s.publisher, s.year].filter(Boolean).map(esc).join(', ');
        return '<li>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + label + '</a>' : label) +
          (bits ? ' <span>(' + bits + ')</span>' : '') + '</li>';
      }).join('') + '</ol>';
    }
    if (e.related.length) {
      html += '<h2>Related</h2><div class="rel">' + e.related.map(function (r) {
        return '<a href="#' + r + '">' + esc(bySlug[r].title) + '</a>';
      }).join('') + '</div>';
    }
    html += '</div>';
    if (e.tags.length) {
      html += '<p class="tags">Tags: ' + e.tags.map(function (t) {
        return '<button type="button" data-ask="' + esc(t) + '">' + esc(t) + '</button>';
      }).join(', ') + '</p>';
    }
    html += '<p class="note">This is a summary written to help you find and use the original. Check the linked source before ' +
      'relying on it for a decision, especially for statutory duties, which change.</p></article>';
    main.innerHTML = html;
    document.title = e.title + ' · Staffroom Reference';
  }

  function currentHash() {
    return decodeURIComponent((location.hash || '').replace(/^#/, ''));
  }
  function renderNav(active) {
    var html = '<a href="#home"' + (active === 'home' ? ' aria-current="page"' : '') + '>All areas<span class="n">' + entries.length + '</span></a>';
    categories.forEach(function (c) {
      var n = (byCat[c.slug] || []).length;
      if (!n) return;
      html += '<a href="#cat-' + c.slug + '"' + (active === c.slug ? ' aria-current="page"' : '') + '>' + esc(c.name) +
        '<span class="n">' + n + '</span></a>';
    });
    nav.innerHTML = html;
  }

  function render(keepScroll) {
    clearBtn.hidden = !state.query;
    if (state.query.trim()) {
      renderNav('');
      viewResults();
    } else {
      var h = currentHash();
      var e = bySlug[h];
      var c = h.indexOf('cat-') === 0 && categories.filter(function (x) { return x.slug === h.slice(4); })[0];
      if (e) { renderNav(e.category); viewEntry(e); }
      else if (c) { renderNav(c.slug); viewCategory(c); }
      else { renderNav('home'); viewHome(); }
    }
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function setQuery(q, focus) {
    state.query = q;
    state.type = 'all';
    input.value = q;
    render();
    if (focus) input.focus();
  }

  var timer;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      state.query = input.value;
      state.type = 'all';
      render();
    }, 90);
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { setQuery('', true); }
  });
  clearBtn.addEventListener('click', function () { setQuery('', true); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === '/' && document.activeElement !== input && !ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      input.focus();
      input.select();
    }
  });

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-ask],[data-type],[data-back],a[href^="#"]');
    if (!t) return;
    if (t.hasAttribute('data-ask')) { state.lastQuery = ''; setQuery(t.getAttribute('data-ask')); return; }
    if (t.hasAttribute('data-type')) { state.type = t.getAttribute('data-type'); render(true); return; }
    if (t.hasAttribute('data-back')) { ev.preventDefault(); setQuery(state.lastQuery); return; }
    // An in-page link: leave search and show the target.
    var target = t.getAttribute('href').slice(1);
    state.lastQuery = (state.query.trim() && bySlug[target]) ? state.query.trim() : (bySlug[target] ? state.lastQuery : '');
    if (!bySlug[target]) state.lastQuery = '';
    var had = !!state.query;
    state.query = '';
    input.value = '';
    state.type = 'all';
    if (had && target === currentHash()) render();
  });
  window.addEventListener('hashchange', function () { render(); });

  document.getElementById('foot').innerHTML =
    '<p>Staffroom Reference covers secondary schools in England. Entries summarise published evidence, guidance and ' +
    'professional writing in our own words and link to the originals. It is general information, not legal advice.</p>' +
    '<p>' + entries.length + ' entries. Built ' + esc(fmtDate(data.built)) + '.</p>';

  render(true);
})();
