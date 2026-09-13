const supportedCommands = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);

function removeLeadingComments(sql) {
  let remaining = sql.trimStart();
  while (remaining.startsWith('--') || remaining.startsWith('/*')) {
    if (remaining.startsWith('--')) {
      const lineEnd = remaining.indexOf('\n');
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd + 1).trimStart();
    } else {
      const commentEnd = remaining.indexOf('*/');
      if (commentEnd === -1) return '';
      remaining = remaining.slice(commentEnd + 2).trimStart();
    }
  }
  return remaining;
}

export function validateSql(sql) {
  if (typeof sql !== 'string' || !sql.trim()) {
    return 'Enter a SQL query.';
  }

  const statement = removeLeadingComments(sql);
  const command = statement.match(/^([a-zA-Z]+)/)?.[1]?.toUpperCase();

  if (!supportedCommands.has(command)) {
    return 'Only SELECT, INSERT, UPDATE, and DELETE statements are supported by this console.';
  }

  // PostgreSQL's driver executes multiple statements in one request; prohibit that
  // explicitly so administrative SQL cannot be appended after an allowed statement.
  const firstSemicolon = statement.indexOf(';');
  if (firstSemicolon !== -1 && statement.slice(firstSemicolon + 1).trim()) {
    return 'Submit one SQL statement at a time.';
  }

  return null;
}
