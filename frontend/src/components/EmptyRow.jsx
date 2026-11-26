// A table row that says "Loading…" or "No data", spanning all columns.
export default function EmptyRow({ cols, icon = '📭', text }) {
  return (
    <tr>
      <td colSpan={cols}>
        <div className="empty-state">
          <div className="icon">{icon}</div>
          <p>{text}</p>
        </div>
      </td>
    </tr>
  );
}
