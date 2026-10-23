import { useState } from 'react';

const methodFor = { add: 'POST', update: 'PATCH', delete: 'DELETE' };
const titleFor = { add: 'Add', update: 'Update', delete: 'Delete' };
const labelFor = (name) => name.replaceAll('_', ' ');
const display = (value) => value === null ? 'NULL' : typeof value === 'object' ? JSON.stringify(value) : String(value);

async function api(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'The request failed.');
  return payload;
}

function ValueField({ column, value = '', isNull = false, required, keyField = false, onChange, onNull }) {
  const id = `crud-${keyField ? 'key-' : ''}${column.name}`;
  const type = column.type === 'date' ? 'date' : /timestamp/.test(column.type) ? 'datetime-local' : 'text';
  return <div className="crud-field">
    <label htmlFor={id}>{labelFor(column.name)}{required && ' *'}{keyField && <span className="key-badge">PRIMARY KEY</span>}</label>
    <input id={id} value={value} disabled={isNull} required={required && !isNull} type={type}
      inputMode={/integer|numeric|decimal|real|double/.test(column.type) ? 'decimal' : undefined}
      step={type === 'datetime-local' ? 'any' : undefined}
      placeholder={keyField ? 'Enter record ID' : column.hasDefault ? 'Leave blank for default' : column.type === 'boolean' ? 'true or false' : column.type === 'ARRAY' ? '{value1,value2}' : `Enter ${labelFor(column.name)}`}
      onChange={(event) => onChange(event.target.value)} />
    <div className="field-detail"><small>{column.type}</small>{column.nullable && !keyField && <label className="null-option"><input type="checkbox" checked={isNull} onChange={(event) => onNull(event.target.checked)} />Set NULL</label>}</div>
  </div>;
}

export default function RecordManager({ tables, loadingSchema }) {
  const [selectedTable, setSelectedTable] = useState('');
  const [operation, setOperation] = useState('add');
  const [values, setValues] = useState({});
  const [nulls, setNulls] = useState({});
  const [keys, setKeys] = useState({});
  const [updateField, setUpdateField] = useState('');
  const [preview, setPreview] = useState(null);
  const [sql, setSql] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const names = Object.keys(tables);
  const table = selectedTable || names[0] || '';
  const columns = tables[table] || [];
  const primaryKeys = columns.filter((column) => column.primaryKey);
  const writable = columns.filter((column) => !column.readOnly && (operation === 'add' || !column.primaryKey));
  const selectedColumn = writable.find((column) => column.name === updateField);
  const canMutate = operation === 'add' || primaryKeys.length > 0;
  const endpoint = `/api/tables/${encodeURIComponent(table)}`;

  const invalidate = () => { setPreview(null); setSql(''); setError(''); setResult(null); setConfirming(false); };
  const reset = () => { setValues({}); setNulls({}); setKeys({}); setUpdateField(''); invalidate(); };
  const field = (column, keyField = false) => <ValueField key={column.name} column={column} keyField={keyField}
    value={(keyField ? keys : values)[column.name] || ''} isNull={!keyField && Boolean(nulls[column.name])}
    required={keyField || (operation === 'add' && !column.nullable && !column.hasDefault)}
    onChange={(value) => { invalidate(); (keyField ? setKeys : setValues)((previous) => ({ ...previous, [column.name]: value })); }}
    onNull={(checked) => { invalidate(); setNulls((previous) => ({ ...previous, [column.name]: checked })); }} />;

  const generate = async (event) => {
    event.preventDefault();
    if (busy || !table || !canMutate) return;
    invalidate(); setBusy('preview');
    try {
      if (operation === 'update' && !selectedColumn) throw new Error('Select a field to update.');
      const fields = operation === 'add' ? writable : operation === 'update' ? [selectedColumn] : [];
      const input = Object.fromEntries(fields.filter((column) => operation === 'update' || nulls[column.name] || values[column.name] !== undefined && values[column.name] !== '')
        .map((column) => [column.name, nulls[column.name] ? null : values[column.name] ?? '']));
      const body = { operation, ...(operation !== 'delete' ? { values: input } : {}), ...(operation !== 'add' ? { keys } : {}) };
      const payload = await api(`${endpoint}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setSql(payload.sql); setPreview(body);
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  };

  const execute = async () => {
    if (!preview || busy) return;
    setBusy('execute'); setError(''); setResult(null);
    try {
      const payload = await api(`${endpoint}/records`, { method: methodFor[preview.operation], headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preview) });
      setResult({ message: `1 record ${preview.operation === 'add' ? 'added' : preview.operation === 'update' ? 'updated' : 'deleted'} successfully.`, row: payload.row });
      setPreview(null); setConfirming(false);
    } catch (err) { setError(err.message); setConfirming(false); }
    finally { setBusy(''); }
  };

  return <section className="crud-section" aria-labelledby="operations-heading">
    <div className="section-heading"><div><p className="eyebrow">WORK WITH YOUR DATA</p><h2 id="operations-heading">Database Operations</h2></div><span className="section-note">ADD · UPDATE · DELETE</span></div>
    <div className="crud-grid">
      <section className="crud-form-panel" aria-labelledby="operation-heading">
        <div className="crud-panel-head"><div><span className="crud-badge">{table || 'TABLE'}</span><h3 id="operation-heading">{titleFor[operation]} {table ? labelFor(table) : 'record'}</h3></div>
          <div className="crud-tabs" role="group" aria-label="Database operation">{Object.keys(titleFor).map((item) => <button key={item} className={`crud-tab${operation === item ? ' active' : ''}`} aria-pressed={operation === item} disabled={Boolean(busy)} onClick={() => { setOperation(item); reset(); }}>{item.toUpperCase()}</button>)}</div>
        </div>
        <form onSubmit={generate} aria-label={`${titleFor[operation]} record`}>
          <fieldset disabled={Boolean(busy) || loadingSchema || !table}>
            <div className="crud-table-select"><label htmlFor="crud-table">TABLE</label><select id="crud-table" value={table} onChange={(event) => { setSelectedTable(event.target.value); reset(); }}>
              {!names.length && <option value="">{loadingSchema ? 'Loading tables…' : 'No tables available'}</option>}
              {names.map((name) => <option key={name} value={name}>{name}</option>)}
            </select></div>
            {!canMutate && <p className="crud-help">This table has no primary key. Choose a table with a primary key to {operation} a record.</p>}
            <div className="crud-form">
              {operation !== 'add' && primaryKeys.map((column) => field(column, true))}
              {operation === 'add' && writable.map((column) => field(column))}
              {operation === 'update' && canMutate && <div className="crud-field"><label htmlFor="update-field">FIELD TO UPDATE</label><select id="update-field" required value={updateField} onChange={(event) => { setUpdateField(event.target.value); setValues({}); setNulls({}); invalidate(); }}><option value="">Select a field…</option>{writable.map((column) => <option key={column.name} value={column.name}>{labelFor(column.name)}</option>)}</select></div>}
              {operation === 'update' && selectedColumn && field(selectedColumn)}
            </div>
            {operation === 'add' && <p className="crud-help">Blank optional fields use database defaults. Generated fields are filled automatically.</p>}
            {operation === 'delete' && canMutate && <p className="crud-help">Enter the primary key of the record to delete. You can review the SQL before confirming.</p>}
            <div className="crud-actions"><button className="run" type="submit" disabled={!canMutate}>{busy === 'preview' ? 'GENERATING…' : 'PREVIEW SQL'}</button><button className="clear" type="button" onClick={reset}>RESET</button></div>
          </fieldset>
        </form>
      </section>
      <section className="crud-sql-panel" aria-labelledby="generated-heading">
        <div className="results-heading"><h3 id="generated-heading">GENERATED SQL</h3><span className={`sql-status${preview ? ' ready' : ''}`}>{busy ? 'WORKING' : preview ? 'READY' : result ? 'EXECUTED' : 'WAITING'}</span></div>
        <pre className="crud-sql" aria-label="Generated SQL">{sql || '-- Fill the form and click\n-- "PREVIEW SQL" to generate a query.'}</pre>
        <div className="crud-execute"><button className={operation === 'delete' ? 'danger' : 'run'} disabled={!preview || Boolean(busy)} onClick={() => operation === 'delete' ? setConfirming(true) : execute()}>{busy === 'execute' ? 'EXECUTING…' : 'EXECUTE SQL'}</button><span>Preview first. Execute when ready.</span></div>
        {confirming && <div className="delete-confirmation" role="alertdialog" aria-labelledby="delete-heading" aria-describedby="delete-description"><h3 id="delete-heading">Delete this record?</h3><p id="delete-description">This permanently deletes the matching record from {table}.</p><div className="crud-confirm-actions"><button className="clear" disabled={Boolean(busy)} onClick={() => setConfirming(false)}>Cancel</button><button className="danger" disabled={Boolean(busy)} onClick={execute}>Confirm delete</button></div></div>}
        <div className={`crud-result${error ? ' error' : result ? ' success' : ''}`} aria-live="polite">
          {error ? <p role="alert">{error}</p> : result ? <><p role="status">{result.message}</p><dl>{Object.entries(result.row).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{display(value)}</dd></div>)}</dl></> : <p>{preview ? 'SQL generated. Review it, then execute to apply the change.' : 'Query results will appear here.'}</p>}
        </div>
      </section>
    </div>
  </section>;
}
