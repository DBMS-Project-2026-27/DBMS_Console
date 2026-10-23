import { useEffect, useMemo, useRef, useState } from 'react';

const modes = [
  { id: 'neo4j', name: 'Neo4j Aura', language: 'CYPHER', icon: '◉' },
  { id: 'postgres', name: 'Neon PostgreSQL', language: 'SQL', icon: '▤' },
];

const starterText = {
  neo4j: 'MATCH (n) RETURN n LIMIT 25;',
  postgres: 'SELECT * FROM public.orders LIMIT 20;',
};

const HISTORY_KEY = 'pantrygraph.query-history.v1';

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, 30) : [];
  } catch { return []; }
}

function Icon({ children, className = '' }) {
  return <span className={`icon ${className}`} aria-hidden="true">{children}</span>;
}

function AccessScreen({ configured, onAuthenticated, serviceUnavailable = false }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Sign-in failed.');
      setPassword('');
      onAuthenticated();
    } catch (cause) {
      setError(cause.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="access-screen">
      <form className="access-card" onSubmit={signIn}>
        <div className="brand-mark access-mark"><span /><span /><span /></div>
        <div className="brand-name">pantry<span>graph</span></div>
        <div className="brand-caption">PRIVATE DATABASE CONSOLE</div>
        <h1>{serviceUnavailable ? 'Console unavailable' : configured ? 'Sign in to your console' : 'Secure access is not configured'}</h1>
        {serviceUnavailable ? <p>Could not reach the app service. Refresh this page and try again.</p> : configured ? <><p>Enter the private access password to open this database workspace.</p><label htmlFor="access-password">Access password</label><input id="access-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /><button className="run-button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>{error && <div className="access-error" role="alert">{error}</div>}</> : <p>Add a strong <code>APP_PASSWORD</code> environment variable (at least 24 characters) to the Vercel project, then redeploy.</p>}
      </form>
    </main>
  );
}

function App() {
  const [database, setDatabase] = useState('neo4j');
  const [query, setQuery] = useState(starterText.neo4j);
  const [resultMode, setResultMode] = useState('Graph');
  const [activeTab, setActiveTab] = useState('results');
  const [notice, setNotice] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [showParameters, setShowParameters] = useState(false);
  const [queryState, setQueryState] = useState('ready');
  const [queryResult, setQueryResult] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [presetSearch, setPresetSearch] = useState('');
  const [history, setHistory] = useState(readHistory);
  const [health, setHealth] = useState({ neo4j: 'checking', postgres: 'checking' });
  const [schemaData, setSchemaData] = useState(null);
  const [schemaState, setSchemaState] = useState('idle');
  const [schemaError, setSchemaError] = useState('');
  const [auth, setAuth] = useState({ state: 'loading', required: true, configured: false, authenticated: false });
  const selected = modes.find((mode) => mode.id === database);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/status')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not check sign-in status.');
        return payload;
      })
      .then((status) => { if (active) setAuth({ state: 'ready', ...status }); })
      .catch(() => { if (active) setAuth({ state: 'error', required: true, configured: false, authenticated: false }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (auth.state !== 'ready' || (auth.required && !auth.authenticated)) return undefined;
    let active = true;
    const refreshHealth = () => fetch('/api/health/databases')
      .then((response) => {
        if (response.status === 401) {
          setAuth((current) => ({ ...current, authenticated: false }));
          throw new Error('Sign-in required.');
        }
        return response.json();
      })
      .then(({ databases }) => {
        if (active && databases) setHealth({ neo4j: databases.neo4j.status, postgres: databases.postgres.status });
      })
      .catch(() => {
        if (active) setHealth({ neo4j: 'error', postgres: 'error' });
      });
    refreshHealth();
    const interval = window.setInterval(refreshHealth, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [auth.state, auth.required, auth.authenticated]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('[aria-label="Search queries"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (activeTab !== 'schema' || auth.state !== 'ready' || (auth.required && !auth.authenticated)) return undefined;
    const controller = new AbortController();
    setSchemaState('loading');
    setSchemaError('');
    setSchemaData(null);
    fetch(`/api/schema/${database}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (response.status === 401) setAuth((current) => ({ ...current, authenticated: false }));
        if (!response.ok) throw new Error(payload.error || 'Schema discovery failed.');
        return payload;
      })
      .then((payload) => {
        setSchemaData(payload);
        setSchemaState('ready');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setSchemaError(error.message || 'Schema discovery failed.');
        setSchemaState('error');
      });
    return () => controller.abort();
  }, [activeTab, database, auth.state, auth.required, auth.authenticated]);

  function switchDatabase(id) {
    setDatabase(id);
    setQuery(starterText[id]);
    setParameters(id === 'postgres' ? '[]' : '{}');
    setNotice('');
    setQueryResult(null);
    setSelectedEntity(null);
    setQueryState('ready');
  }

  async function runQuery() {
    setNotice('');
    setActiveTab('results');
    setSelectedEntity(null);
    setQueryResult(null);
    setQueryState('running');
    try {
      const parsedParameters = JSON.parse(parameters || '[]');
      if (database === 'postgres' && !Array.isArray(parsedParameters)) throw new Error('SQL parameters must be a JSON array, for example [].');
      if (database === 'neo4j' && (!parsedParameters || Array.isArray(parsedParameters) || typeof parsedParameters !== 'object')) throw new Error('Cypher parameters must be a JSON object, for example {}.');
      const response = await fetch(`/api/query/${database}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, parameters: parsedParameters }),
      });
      const payload = await response.json();
      if (response.status === 401) setAuth((current) => ({ ...current, authenticated: false }));
      if (!response.ok || payload.error) throw new Error(payload.error || 'Query failed.');
      setQueryResult(payload);
      setResultMode(payload.resultType === 'graph' ? 'Graph' : 'Table');
      setActiveTab('results');
      setQueryState('ready');
      const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, database, query, parameters, at: new Date().toISOString(), rows: payload.rowCount };
      setHistory((current) => {
        const next = [entry, ...current.filter((item) => item.query !== query || item.database !== database)].slice(0, 30);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Local history is optional. */ }
        return next;
      });
    } catch (error) {
      setQueryResult(null);
      setNotice(error instanceof SyntaxError ? 'Parameters must be valid JSON in the editor, such as [] for SQL or {} for Cypher.' : error.message || 'Query failed.');
      setQueryState('error');
    }
  }

  function resetQuery() {
    setQuery(starterText[database]);
    setParameters(database === 'postgres' ? '[]' : '{}');
    setNotice('');
    setQueryResult(null);
    setQueryState('ready');
    setSelectedEntity(null);
  }

  function loadPreset(preset) {
    if (preset.database !== database) switchDatabase(preset.database);
    setQuery(preset.query);
    setParameters(preset.database === 'postgres' ? '[]' : '{}');
    setNotice('');
    setActiveTab('results');
  }

  function loadHistoryItem(item) {
    switchDatabase(item.database);
    setQuery(item.query);
    setParameters(item.parameters || (item.database === 'postgres' ? '[]' : '{}'));
    setActiveTab('results');
  }

  const presets = useMemo(() => {
    if (!schemaData || schemaData.engine !== database) return [];
    if (database === 'postgres') return (schemaData.tables || []).map((table) => {
      const quote = (name) => `"${String(name).replaceAll('"', '""')}"`;
      return { id: `${table.schema}.${table.name}`, database, title: `${table.schema}.${table.name}`, category: 'Verified tables', query: `SELECT * FROM ${quote(table.schema)}.${quote(table.name)} LIMIT 25;` };
    });
    const labels = (schemaData.labels || []).map((label) => ({ id: `label:${label.name}`, database, title: `Explore ${label.name}`, category: 'Node labels', query: `MATCH (n:\`${label.name.replaceAll('`', '``')}\`) RETURN n LIMIT 25;` }));
    const relations = (schemaData.relationshipTypes || []).map((relationship) => ({ id: `rel:${relationship.name}`, database, title: `Explore ${relationship.name}`, category: 'Relationships', query: `MATCH (a)-[r:\`${relationship.name.replaceAll('`', '``')}\`]-(b) RETURN a, r, b LIMIT 25;` }));
    return [...labels, ...relations];
  }, [schemaData, database]);
  const visiblePresets = presets.filter((preset) => `${preset.title} ${preset.category}`.toLowerCase().includes(presetSearch.toLowerCase()));

  const connectedCount = Object.values(health).filter((status) => status === 'connected').length;
  const selectedHealth = health[database];
  const connectionLabel = selectedHealth === 'connected' ? 'Connected' : selectedHealth === 'checking' ? 'Checking…' : selectedHealth === 'error' ? 'Connection error' : 'Not configured';

  if (auth.state === 'loading') return <AccessScreen configured={false} serviceUnavailable />;
  if (auth.state === 'error') return <AccessScreen configured={false} serviceUnavailable />;
  if (auth.required && !auth.configured) return <AccessScreen configured={false} />;
  if (auth.required && !auth.authenticated) return <AccessScreen configured onAuthenticated={() => setAuth((current) => ({ ...current, state: 'ready', authenticated: true }))} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><div className="brand-name">pantry<span>graph</span></div><div className="brand-caption">DATA CONSOLE <span>·</span> 0.1</div></div>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="connection-card">
          <div className="connection-top"><div className={`db-glyph ${database}`}>{selected.icon}</div><button className="chevron-button" title="Choose database">⌄</button></div>
          <div className="connection-name">{selected.name}</div>
          <div className="connection-state"><span className={`status-dot ${selectedHealth}`} /> {connectionLabel}</div>
          <div className="connection-divider" />
          <div className="connection-foot"><Icon>⌁</Icon> Read-only connection <span className="lock">⌑</span></div>
        </div>

        <div className="side-section-head"><span>QUERY LIBRARY</span><button title="Add preset" disabled>＋</button></div>
        <label className="search-box"><Icon>⌕</Icon><input placeholder="Search queries..." aria-label="Search queries" value={presetSearch} onChange={(event) => setPresetSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
        {visiblePresets.length ? <div className="query-library-items">{[...new Set(visiblePresets.map((preset) => preset.category))].map((category) => <section className="preset-group" key={category}><h3>{category}</h3>{visiblePresets.filter((preset) => preset.category === category).map((preset) => <button key={preset.id} className="preset-item" onClick={() => loadPreset(preset)} title={preset.query}><span>{preset.title}</span></button>)}</section>)}</div> : <div className="empty-library"><div className="empty-library-icon">⌘</div><p>{schemaData?.engine === database ? 'No matching presets' : 'No verified presets yet'}</p><span>{schemaData?.engine === database ? 'Try another search.' : 'Open Schema to inspect your real tables and labels. Presets are generated from that verified schema.'}</span></div>}

        <div className="sidebar-bottom">
          <details className="history-panel"><summary className="side-link"><Icon>◷</Icon><span>Query history</span><span className="side-count">{history.length}</span></summary>{history.length ? <div className="history-items">{history.slice(0, 8).map((item) => <button key={item.id} className="history-item" onClick={() => loadHistoryItem(item)}><strong>{item.query.replace(/\s+/g, ' ').slice(0, 54)}</strong><small>{item.database === 'postgres' ? 'SQL' : 'CYPHER'} · {item.rows} rows · {new Date(item.at).toLocaleTimeString()}</small></button>)}</div> : <div className="history-empty">Successful queries appear here on this device.</div>}</details>
          <button className="side-link schema-link" onClick={() => setActiveTab('schema')}><Icon>◫</Icon><span>Schema explorer</span><span className="side-chevron">›</span></button>
          <div className="user-card"><div className="avatar">PG</div><div className="user-details"><strong>Developer</strong><span>Local workspace</span></div><button className="dots">···</button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{selected.name}</strong></div>
          <div className="topbar-right"><div className="environment-pill"><span className="env-dot" /> {auth.required ? 'PRIVATE' : 'LOCAL'}</div><button className="help-button">? <span>Docs</span></button>{auth.required && <button className="signout-button" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setAuth((current) => ({ ...current, authenticated: false })); }}>Sign out</button>}<div className="top-avatar">PG</div></div>
        </header>

        <section className="workspace-content">
          <div className="page-heading"><div><div className="eyebrow">DATA WORKSPACE <span>·</span> DEVELOPMENT</div><h1>Explore your <em>grocery graph.</em></h1><p>Query, inspect, and understand the data powering your delivery platform.</p></div><div className="connection-health"><span className={`health-pulse ${connectedCount ? 'connected' : ''}`} /> {connectedCount} / 2 CONNECTED</div></div>

          <div className="db-switcher" role="tablist" aria-label="Database workspace">
            {modes.map((mode) => <button key={mode.id} role="tab" aria-selected={database === mode.id} className={`db-tab ${database === mode.id ? 'selected' : ''}`} onClick={() => switchDatabase(mode.id)}><span className={`tab-icon ${mode.id}`}>{mode.icon}</span><span>{mode.name}</span><span className="tab-language">{mode.language}</span></button>)}
          </div>

          <div className="query-card">
            <div className="query-card-head"><div className="query-title"><span className="terminal-icon">›_</span><strong>Query editor</strong><span className="editor-language">{selected.language}</span></div><div className="editor-actions"><span className="shortcut-hint">Ctrl ↵ to run</span><button className="icon-button" title="Editor options">···</button></div></div>
            <div className="editor-body"><div className="line-numbers">{query.split('\n').map((_, index) => <span key={index}>{index + 1}<br /></span>)}</div><textarea spellCheck="false" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runQuery(); } }} aria-label={`${selected.language} query editor`} /></div>
            <div className="query-card-foot"><button className="parameter-chip" onClick={() => setShowParameters(!showParameters)}><Icon>{'{}'}</Icon><span>Parameters</span><span className="param-value">{database === 'postgres' ? '[]' : '{}'}</span><span className="param-chevron">⌄</span></button><div className="run-actions"><button className="reset-button" onClick={resetQuery}><Icon>↺</Icon> Reset</button><button className="run-button" onClick={runQuery} disabled={queryState === 'running'}><span>▶</span> {queryState === 'running' ? 'Running…' : 'Run query'} <kbd>⌘ ↵</kbd></button></div></div>
            {showParameters && <div className="parameters-editor"><label htmlFor="query-parameters">JSON parameters {database === 'postgres' ? '(SQL uses $1, $2, …)' : '(Cypher uses $name)'}</label><textarea id="query-parameters" value={parameters} onChange={(event) => setParameters(event.target.value)} spellCheck="false" /></div>}
          </div>

          <div className="results-panel">
            <div className="results-head"><div className="results-tabs"><button onClick={() => setActiveTab('results')} className={activeTab === 'results' ? 'active' : ''}>Results</button><button onClick={() => setActiveTab('schema')} className={activeTab === 'schema' ? 'active' : ''}>Schema <span className="beta-tag">LIVE</span></button></div><div className="result-meta"><span className="muted-label">STATUS</span><span className={`status-ready ${queryState === 'error' ? 'status-error' : ''}`}><span /> {queryState.toUpperCase()}</span><span className="meta-divider" /><span className="muted-label">DURATION</span><strong>{queryResult ? `${queryResult.durationMs} ms` : '—'}</strong><span className="meta-divider" /><span className="muted-label">{queryResult?.resultType === 'graph' ? 'NODES' : 'ROWS'}</span><strong>{queryResult?.resultType === 'graph' ? queryResult.graph.nodes.length : queryResult?.rowCount ?? 0}</strong></div></div>
            {activeTab === 'results' ? queryResult ? <QueryResults result={queryResult} database={database} resultMode={resultMode} setResultMode={setResultMode} notice={notice} onSelectEntity={setSelectedEntity} /> : <div className="result-empty"><div className="empty-orbit"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-center"><span className="brand-mark small"><span/><span/><span/></span></div><i className="orbit-node node-a"/><i className="orbit-node node-b"/><i className="orbit-node node-c"/></div><h2>Your data, in focus.</h2><p>Run a query to explore records and relationships.<br />Results will appear here as a graph or table.</p>{notice && <div className="notice-message" role="status"><span>ⓘ</span>{notice}</div>}</div> : <SchemaView database={database} loading={schemaState === 'loading'} error={schemaError} data={schemaData} />}
            {activeTab === 'results' && selectedEntity && <EntityInspector entity={selectedEntity} onClose={() => setSelectedEntity(null)} />}
            <div className="results-foot"><span><i className="tiny-dot"/> {selected.name} <span className="foot-separator">/</span> {selected.language}</span><span className="results-foot-right">{queryResult ? `${queryResult.truncated ? 'First 500 rows shown' : `${queryResult.rowCount} rows returned`} · Ready` : 'No result set · Ready'}</span></div>
          </div>

          <div className="bottom-hint"><span className="hint-star">✳</span><span>Start with your schema. Your data stays yours.</span><span className="hint-divider"/><span className="secure-icon">⌑</span><span>Credentials are stored locally</span><button title="More information">ⓘ</button></div>
        </section>
      </main>
    </div>
  );
}

function QueryResults({ result, database, resultMode, setResultMode, notice, onSelectEntity }) {
  const columns = (result.columns || []).map((column) => typeof column === 'string' ? { name: column } : column);
  const hasGraph = database === 'neo4j' && (result.graph?.nodes?.length || result.graph?.relationships?.length);
  const showGraph = hasGraph && resultMode === 'Graph';
  return <div className="query-results-wrap">
    {notice && <div className="notice-message" role="alert">{notice}</div>}
    {result.truncated && <div className="results-truncated">Showing at most 500 records. Add a LIMIT clause for smaller results.</div>}
    {database === 'neo4j' && <div className="result-mode"><button className={resultMode === 'Graph' ? 'active' : ''} disabled={!hasGraph} onClick={() => setResultMode('Graph')}><span>✣</span> Graph</button><button className={resultMode === 'Table' ? 'active' : ''} onClick={() => setResultMode('Table')}><span>▦</span> Table</button></div>}
    {showGraph ? <GraphCanvas graph={result.graph} onSelectEntity={onSelectEntity} /> : !columns.length ? <div className="query-no-columns">Query completed. No rows were returned.</div> : <div className="query-table-scroll"><table className="query-table"><thead><tr>{columns.map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.name}>{row[column.name] == null ? <span className="sql-null">NULL</span> : typeof row[column.name] === 'object' ? JSON.stringify(row[column.name]) : String(row[column.name])}</td>)}</tr>)}</tbody></table></div>}
  </div>;
}

function GraphCanvas({ graph, onSelectEntity }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [layout, setLayout] = useState('cose');
  useEffect(() => {
    if (!containerRef.current) return undefined;
    let disposed = false;
    let cy;
    let resize;
    import('cytoscape').then(({ default: cytoscape }) => {
      if (disposed || !containerRef.current) return;
      const nodes = (graph.nodes || []).map((node) => {
        const summary = ['name', 'title', 'product_name', 'sku'].map((key) => node.properties?.[key]).find((value) => typeof value === 'string' && value.length);
        const label = [node.labels?.[0] || 'Node', summary ? String(summary).slice(0, 28) : ''].filter(Boolean).join(' · ');
        return { group: 'nodes', data: { id: node.id, label, entity: node } };
      });
      const nodeIds = new Set((graph.nodes || []).map((node) => node.id));
      const edges = (graph.relationships || []).filter((rel) => nodeIds.has(rel.startNodeId) && nodeIds.has(rel.endNodeId)).map((rel) => ({ group: 'edges', data: { id: rel.id, source: rel.startNodeId, target: rel.endNodeId, label: rel.type, entity: rel } }));
      cy = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        style: [
          { selector: 'node', style: { 'background-color': '#a9dc5d', 'label': 'data(label)', 'color': '#e7e9e1', 'font-size': 10, 'text-valign': 'bottom', 'text-margin-y': 7, 'text-outline-color': '#11130f', 'text-outline-width': 2, 'width': 34, 'height': 34, 'border-width': 1, 'border-color': '#d1f28c' } },
          { selector: 'edge', style: { 'width': 1.5, 'line-color': '#667a45', 'target-arrow-color': '#a9dc5d', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'label': 'data(label)', 'font-size': 8, 'color': '#b8c99a', 'text-background-color': '#11130f', 'text-background-opacity': 1, 'text-background-padding': 2 } },
          { selector: ':selected', style: { 'border-width': 3, 'border-color': '#f0f6d8', 'line-color': '#c3ef70', 'width': 2.5 } },
        ],
        layout: { name: layout, animate: false, fit: true, padding: 35, nodeRepulsion: 6000, idealEdgeLength: 90 },
        minZoom: 0.2, maxZoom: 3, wheelSensitivity: 0.2,
      });
      cy.on('tap', 'node, edge', (event) => onSelectEntity(event.target.data('entity')));
      cyRef.current = cy;
      resize = new ResizeObserver(() => cy.resize());
      resize.observe(containerRef.current);
    });
    return () => { disposed = true; resize?.disconnect(); cy?.destroy(); cyRef.current = null; };
  }, [graph, layout, onSelectEntity]);
  return <div className="graph-view"><div className="graph-toolbar"><span>{graph.nodes?.length || 0} nodes · {graph.relationships?.length || 0} relationships</span><div><button onClick={() => setLayout((current) => current === 'cose' ? 'breadthfirst' : 'cose')}>Change layout</button><button onClick={() => cyRef.current?.fit(undefined, 35)}>Fit graph</button></div></div><div ref={containerRef} className="graph-canvas" aria-label="Interactive graph results" /></div>;
}

function EntityInspector({ entity, onClose }) {
  const title = entity.type || entity.labels?.join(':') || entity.kind || 'Graph entity';
  return <aside className="entity-inspector"><div className="inspector-head"><div><small>{entity.type ? 'RELATIONSHIP' : 'NODE'}</small><strong>{title}</strong></div><button onClick={onClose} aria-label="Close inspector">×</button></div><div className="inspector-content">{entity.type && <div className="inspector-endpoints"><span>Start</span><code>{entity.startNodeId}</code><span>End</span><code>{entity.endNodeId}</code></div>}<h4>Properties</h4>{Object.keys(entity.properties || {}).length ? <dl>{Object.entries(entity.properties).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl> : <p>No properties returned.</p>}</div></aside>;
}

function SchemaView({ database, loading, error, data }) {
  if (loading) return <div className="schema-content"><div className="schema-state">Inspecting live {database === 'neo4j' ? 'Neo4j' : 'PostgreSQL'} metadata…</div></div>;
  if (error) return <div className="schema-content"><div className="schema-error"><strong>Could not load schema</strong><p>{error}</p></div></div>;

  if (database === 'neo4j') {
    const labels = data?.labels || [];
    const relationships = data?.relationshipTypes || [];
    return <div className="schema-content">
      <div className="schema-summary"><span>{labels.length} labels</span><span>{relationships.length} relationship types</span></div>
      {labels.length === 0 && relationships.length === 0 ? <div className="schema-state">No labels or relationship types were returned by Neo4j.</div> : <div className="schema-groups">
        <section className="schema-group"><h3>Node labels</h3>{labels.map((item) => <details className="schema-item" key={item.name}><summary><span className="schema-symbol node-symbol">●</span><strong>{item.name}</strong><span className="schema-count">{item.properties.length} properties</span></summary><PropertyList properties={item.properties} /></details>)}</section>
        <section className="schema-group"><h3>Relationship types</h3>{relationships.map((item) => <details className="schema-item" key={item.name}><summary><span className="schema-symbol rel-symbol">↔</span><strong>{item.name}</strong><span className="schema-count">{item.properties.length} properties</span></summary><PropertyList properties={item.properties} /></details>)}</section>
      </div>}
    </div>;
  }

  const tables = data?.tables || [];
  return <div className="schema-content">
    <div className="schema-summary"><span>{tables.length} tables and views</span></div>
    {tables.length === 0 ? <div className="schema-state">No tables or views were returned by PostgreSQL.</div> : <div className="schema-groups"><section className="schema-group postgres-schema-group"><h3>Tables and views</h3>{tables.map((table) => <details className="schema-item" key={`${table.schema}.${table.name}`}><summary><span className="schema-symbol table-symbol">▤</span><strong>{table.schema}.{table.name}</strong><span className="schema-count">{table.columns.length} columns</span></summary><div className="pg-columns"><div className="pg-column-row pg-column-head"><span>Column</span><span>Type</span><span>Rules</span></div>{table.columns.map((column) => <div className="pg-column-row" key={column.name}><code>{column.name}</code><span>{column.type}</span><span>{column.nullable ? 'nullable' : 'required'}{column.default ? ' · default' : ''}</span></div>)}{table.constraints.length > 0 && <div className="pg-constraints"><strong>Constraints</strong>{table.constraints.map((constraint, index) => <div key={`${constraint.name}-${index}`}><code>{constraint.name}</code><span>{constraint.type}{constraint.column ? ` · ${constraint.column}` : ''}{constraint.references ? ` → ${constraint.references.schema}.${constraint.references.table}.${constraint.references.column}` : ''}</span></div>)}</div>}</div></details>)}</section></div>}
  </div>;
}

function PropertyList({ properties }) {
  if (!properties?.length) return <div className="schema-no-properties">No properties reported.</div>;
  return <div className="schema-properties">{properties.map((property, index) => <div className="schema-property" key={`${property.name}-${index}`}><code>{property.name}</code><span>{(property.types || []).join(' | ') || 'type not reported'}</span>{property.mandatory && <em>required</em>}</div>)}</div>;
}

export default App;
