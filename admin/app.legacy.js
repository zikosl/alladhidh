function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(value || 0));
}

function createTable(columns, rows) {
  if (!rows.length) {
    return '<p class="empty">No data available yet.</p>';
  }

  const header = columns.map((column) => `<th>${column.label}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${column.render ? column.render(row) : row[column.key]}</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

async function loadDashboard() {
  const response = await fetch('/api/reports/dashboard');
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to load dashboard');
  }

  const data = result.data;
  const summaryCards = document.getElementById('summaryCards');
  const totals = data.total_profit;

  summaryCards.innerHTML = `
    <article class="stat">
      <label>Total Sales</label>
      <strong>${formatMoney(totals.sales)}</strong>
    </article>
    <article class="stat">
      <label>Gross Profit</label>
      <strong>${formatMoney(totals.gross_profit)}</strong>
    </article>
    <article class="stat">
      <label>Net Profit</label>
      <strong>${formatMoney(totals.net_profit)}</strong>
    </article>
    <article class="stat">
      <label>Stock Alerts</label>
      <strong>${data.stock_alerts.length}</strong>
    </article>
  `;

  document.getElementById('dailySales').innerHTML = createTable(
    [
      { key: 'sale_date', label: 'Date' },
      { key: 'orders_count', label: 'Orders' },
      { key: 'total_sales', label: 'Sales', render: (row) => formatMoney(row.total_sales) }
    ],
    data.daily_sales
  );

  document.getElementById('bestSellers').innerHTML = createTable(
    [
      { key: 'name', label: 'Product' },
      { key: 'total_quantity', label: 'Qty Sold' },
      { key: 'revenue', label: 'Revenue', render: (row) => formatMoney(row.revenue) }
    ],
    data.best_selling_products
  );

  document.getElementById('stockAlerts').innerHTML = createTable(
    [
      { key: 'name', label: 'Ingredient' },
      { key: 'current_stock', label: 'Current Stock' },
      {
        key: 'purchase_price',
        label: 'Unit Cost',
        render: (row) => `<span class="badge">${formatMoney(row.purchase_price)}</span>`
      }
    ],
    data.stock_alerts
  );
}

async function refresh() {
  const button = document.getElementById('refreshButton');
  button.disabled = true;
  button.textContent = 'Loading...';

  try {
    await loadDashboard();
    button.textContent = 'Refresh data';
  } catch (error) {
    button.textContent = 'Retry';
    alert(error.message);
  } finally {
    button.disabled = false;
  }
}

document.getElementById('refreshButton').addEventListener('click', refresh);
refresh();
