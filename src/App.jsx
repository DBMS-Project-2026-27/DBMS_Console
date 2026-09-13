import { useEffect, useState } from 'react';

const initialSql = 'SELECT * FROM PRODUCT LIMIT 25;';

function SchemaExplorer({ tables, loading, error, onInsert }) {
  const [openTable, setOpenTable] = useState(null);
  const entries = Object.entries(tables);
  return <aside className="schema-panel">
    <div className="panel-heading"><span>DATABASE EXPLORER</span><small>{entries.length} tables</small></div>
    {loading && <p className="subtle">Loading database metadata…</p>}
    {error && <p className="error compact">{error}</p>}
    <div className="table-list">
      {entries.map(([tableName, columns]) => <div className="schema-table" key={tableName}>
        <button className="table-toggle" onClick={() => setOpenTable(openTable === tableName ? null : tableName)}>
          <span>{openTable === tableName ? '⌄' : '›'}&nbsp; {tableName}</span><small>{columns.length}</small>
        </button>
        {openTable === tableName && <div className="columns">
          {columns.map((column) => <button key={column.name} className="column" title={`Insert ${column.name}`} onClick={() => onInsert(column.name)}>
            <span>{column.name}</span><small>{column.type}{column.nullable ? '' : ' · required'}</small>
          </button>)}
        </div>}
      </div>)}
    </div>
  </aside>;
}

function Results({ result }) {
  if (!result) return <div className="empty-result">Run a query to view its output here.</div>;
  if (result.error) return <div className="error-result"><strong>PostgreSQL error</strong><pre>{result.error}</pre>{result.code && <small>SQLSTATE: {result.code}{result.position ? ` · position ${result.position}` : ''}</small>}</div>;
  if (!result.columns.length) return <div className="empty-result">{result.command} completed. {result.rowCount ?? 0} row(s) affected.</div>;
  return <div className="result-table-wrap"><table><thead><tr>{result.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>
    {result.rows.map((row, index) => <tr key={index}>{result.columns.map((column) => <td key={column}>{row[column] === null ? <em>NULL</em> : typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}
  </tbody></table>{result.rows.length === 0 && <div className="empty-result">Query returned no rows.</div>}</div>;
}

export default function App() {
  const [sql, setSql] = useState(initialSql);
  const [schema, setSchema] = useState({});
  const [schemaError, setSchemaError] = useState('');
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('grocery-sql-history') || '[]'));

  useEffect(() => {
    fetch('/api/schema').then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Schema request failed.');
      setSchema(payload.tables);
    }).catch((error) => setSchemaError(error.message)).finally(() => setLoadingSchema(false));
  }, []);

  const addHistory = (query) => {
    const next = [query, ...history.filter((item) => item !== query)].slice(0, 12);
    setHistory(next); localStorage.setItem('grocery-sql-history', JSON.stringify(next));
  };

  const runQuery = async () => {
    if (!sql.trim() || running) return;
    setRunning(true); setResult(null);
    try {
      const response = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
      const payload = await response.json();
      setResult(payload); addHistory(sql);
    } catch (error) {
      setResult({ error: `Could not reach the API server: ${error.message}` });
    } finally { setRunning(false); }
  };

  return <main className="app-shell">
    <header><div><p className="eyebrow">POSTGRESQL · NEON</p><h1>Online Grocery Delivery <span>SQL Console</span></h1></div><div className="connection"><i /> LIVE DATABASE CONNECTION</div></header>
    <div className="workspace">
      <SchemaExplorer tables={schema} loading={loadingSchema} error={schemaError} onInsert={(name) => setSql((value) => `${value}${value && !value.endsWith(' ') ? ' ' : ''}${name}`)} />
      <section className="console">
        <div className="editor-card"><div className="editor-bar"><span>QUERY EDITOR</span><span className="hint">Ctrl + Enter to run</span></div>
          <textarea value={sql} onChange={(event) => setSql(event.target.value)} onKeyDown={(event) => { if (event.ctrlKey && event.key === 'Enter') runQuery(); }} spellCheck="false" aria-label="SQL editor" />
          <div className="actions"><button className="clear" onClick={() => { setSql(''); setResult(null); }}>Clear</button><button className="run" disabled={running} onClick={runQuery}>{running ? 'Running…' : '▶ Run Query'}</button></div>
        </div>
        <section className="results-card"><div className="results-heading"><span>QUERY RESULTS</span>{result && <small>{result.error ? 'Failed' : `${result.command} · ${result.executionTimeMs} ms${result.columns?.length ? ` · ${result.rows.length} row(s)` : ` · ${result.rowCount ?? 0} affected`}`}</small>}</div><Results result={result} /></section>
      </section>
      <aside className="history-panel"><div className="panel-heading"><span>QUERY HISTORY</span><small>{history.length}</small></div>{history.length === 0 ? <p className="subtle">Your recently executed queries appear here.</p> : <div className="history-list">{history.map((item, index) => <button key={`${item}-${index}`} onClick={() => setSql(item)}><span>#{history.length - index}</span><code>{item}</code></button>)}</div>}</aside>
    </div>
    <footer>Allowed statements: SELECT · INSERT · UPDATE · DELETE <span>Credentials remain on the server</span></footer>
  </main>;
}
