'use client';

interface OpsNotesProps {
  notes: string[];
  timestamp: string;
}

function getSeverity(note: string): 'critical' | 'warning' | 'info' {
  const upper = note.toUpperCase();
  if (upper.includes('CRITICAL')) return 'critical';
  if (
    upper.includes('WARNING') ||
    upper.includes('CAUTION') ||
    upper.includes('CONCERN') ||
    upper.includes('ATTENTION') ||
    upper.includes('ISSUE') ||
    upper.includes('PROBLEM')
  )
    return 'warning';
  return 'info';
}

const severityStyles = {
  critical: 'border-l-red-500 bg-red-50/50',
  warning: 'border-l-amber-500 bg-amber-50/50',
  info: 'border-l-green-500 bg-green-50/50',
};

export default function OpsNotes({ notes, timestamp }: OpsNotesProps) {
  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Latest Ops Notes</h3>
        {formattedDate && (
          <p className="text-xs text-gray-500">From pulse check on {formattedDate}</p>
        )}
      </div>
      {(!notes || notes.length === 0) ? (
        <div className="text-sm text-gray-400">No ops notes available</div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {notes.map((note, i) => {
            const severity = getSeverity(note);
            return (
              <div
                key={i}
                className={`border-l-4 rounded-r-lg p-3 text-sm text-gray-700 ${severityStyles[severity]}`}
              >
                {note}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
