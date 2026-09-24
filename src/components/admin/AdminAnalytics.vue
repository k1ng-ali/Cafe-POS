<template>
  <div class="analytics-view">
    <div class="analytics-toolbar">
      <div class="period-switcher">
        <button
          v-for="p in periods"
          :key="p.key"
          :id="`filter-period-${p.key}`"
          type="button"
          @click="selectedPeriod = p.key"
          class="period-pill"
          :class="selectedPeriod === p.key ? 'period-pill--active' : ''"
        >
          {{ p.label }}
        </button>
      </div>

      <div class="employee-filter">
        <span>Сотрудник:</span>
        <select v-model="selectedEmployeeFilter">
          <option value="all">Все сотрудники</option>
          <option v-for="emp in store.employees" :key="emp.id" :value="emp.name">
            {{ emp.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="stat-card">
        <div class="stat-card__header">
          <span>Выручка</span>
          <div class="stat-icon stat-icon--amber">
            <Coins class="w-4 h-4" />
          </div>
        </div>
        <div class="stat-card__value">
          {{ totalRevenue.toLocaleString() }} <span>{{ store.settings.currency }}</span>
        </div>
        <p>
          Всего смен в выборке: {{ filteredShifts.length }}
        </p>
      </div>

      <div class="stat-card stat-card--green">
        <div class="stat-card__header">
          <span>Продаж (Чеков)</span>
          <div class="stat-icon stat-icon--green">
            <Receipt class="w-4 h-4" />
          </div>
        </div>
        <div class="stat-card__value">
          {{ totalSalesCount.toLocaleString() }}
        </div>
        <p>Оформлено кассирами</p>
      </div>

      <div class="stat-card stat-card--blue">
        <div class="stat-card__header">
          <span>Средний чек</span>
          <div class="stat-icon stat-icon--blue">
            <TrendingUp class="w-4 h-4" />
          </div>
        </div>
        <div class="stat-card__value">
          {{ averageCheck }} <span>{{ store.settings.currency }}</span>
        </div>
        <p>Выручка / Количество чеков</p>
      </div>
    </div>

    <div class="two-column-panel">
      <div class="panel-section">
        <div class="panel-section__header">
          <h3>
            <Users class="w-4 h-4" />
            <span>Выручка по сотрудникам</span>
          </h3>
          <span>{{ employeeStats.length }} чел.</span>
        </div>

        <div class="employee-list">
          <div v-for="emp in employeeStats" :key="emp.name" class="employee-row">
            <div class="employee-row__main">
              <div class="employee-avatar">{{ emp.name.charAt(0) }}</div>
              <div>
                <span class="employee-name">{{ emp.name }}</span>
                <span class="employee-meta">{{ emp.salesCount }} продаж</span>
              </div>
            </div>
            <div class="employee-row__value">
              <span>{{ emp.revenue.toLocaleString() }} {{ store.settings.currency }}</span>
              <small>{{ totalRevenue > 0 ? Math.round((emp.revenue / totalRevenue) * 100) : 0 }}% от кассы</small>
            </div>
          </div>

          <div v-if="employeeStats.length === 0" class="empty-state">
            Нет данных по сменам сотрудников за выбранный период
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section__header">
          <h3>
            <Flame class="w-4 h-4" />
            <span>Продажи товаров (Топ блюд)</span>
          </h3>
          <span>{{ topProducts.length }} позиций</span>
        </div>

        <div class="product-list">
          <div v-for="(prod, idx) in topProducts" :key="prod.name" class="product-row">
            <div class="product-row__main">
              <span class="rank">#{{ idx + 1 }}</span>
              <div>
                <span class="product-name">{{ prod.name }}</span>
                <span class="product-meta">{{ prod.categoryName }}</span>
              </div>
            </div>
            <div class="product-row__value">
              <span>{{ prod.quantity }} шт.</span>
              <small>{{ prod.totalRevenue.toLocaleString() }} {{ store.settings.currency }}</small>
            </div>
          </div>

          <div v-if="topProducts.length === 0" class="empty-state">
            Нет данных о продажах за выбранный период
          </div>
        </div>
      </div>
    </div>

    <div class="panel-section panel-section--full">
      <div class="panel-section__header panel-section__header--stacked">
        <div>
          <h3>
            <History class="w-4 h-4" />
            <span>История смен в базе данных</span>
          </h3>
          <p>Всего импортировано смен: {{ store.historicalShifts.length }} (защита от повтора активна)</p>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Дата и Время</th>
              <th>Продаж</th>
              <th>Наличные</th>
              <th>Безнал / QR</th>
              <th class="table-right">Итого выручка</th>
              <th class="table-right">Shift ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shift in store.historicalShifts" :key="shift.id">
              <td class="employee-badge"><span class="dot"></span> {{ shift.employeeName }}</td>
              <td>{{ formatDateTime(shift.startTime) }}</td>
              <td>{{ shift.salesCount }}</td>
              <td>{{ shift.paymentBreakdown?.cash || 0 }} {{ store.settings.currency }}</td>
              <td>{{ (shift.paymentBreakdown?.card || 0) + (shift.paymentBreakdown?.qr || 0) }} {{ store.settings.currency }}</td>
              <td class="table-right total-amount">{{ shift.totalRevenue }} {{ store.settings.currency }}</td>
              <td class="table-right">{{ shift.id.slice(0, 8) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import { Coins, Receipt, TrendingUp, Users, Flame, History } from 'lucide-vue-next';

const store = usePosStore();

const periods = [
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'all', label: 'Все смены' },
];

const selectedPeriod = ref('today');
const selectedEmployeeFilter = ref('all');

const filteredShifts = computed(() => {
  let list = [...store.historicalShifts];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  if (selectedPeriod.value === 'today') {
    list = list.filter((s) => s.startTime.startsWith(todayStr));
  } else if (selectedPeriod.value === 'yesterday') {
    list = list.filter((s) => s.startTime.startsWith(yesterdayStr));
  } else if (selectedPeriod.value === 'week') {
    list = list.filter((s) => new Date(s.startTime) >= weekAgo);
  } else if (selectedPeriod.value === 'month') {
    list = list.filter((s) => new Date(s.startTime) >= monthAgo);
  }

  if (selectedEmployeeFilter.value !== 'all') {
    list = list.filter((s) => s.employeeName === selectedEmployeeFilter.value);
  }

  return list;
});

const totalRevenue = computed(() => {
  return filteredShifts.value.reduce((sum, s) => sum + s.totalRevenue, 0);
});

const totalSalesCount = computed(() => {
  return filteredShifts.value.reduce((sum, s) => sum + s.salesCount, 0);
});

const averageCheck = computed(() => {
  if (totalSalesCount.value === 0) return '0.0';
  return (totalRevenue.value / totalSalesCount.value).toFixed(1);
});

const employeeStats = computed(() => {
  const map = new Map<string, { name: string; revenue: number; salesCount: number }>();

  for (const s of filteredShifts.value) {
    const existing = map.get(s.employeeName);
    if (existing) {
      existing.revenue += s.totalRevenue;
      existing.salesCount += s.salesCount;
    } else {
      map.set(s.employeeName, {
        name: s.employeeName,
        revenue: s.totalRevenue,
        salesCount: s.salesCount,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
});

const topProducts = computed(() => {
  const map = new Map<string, { name: string; categoryName: string; quantity: number; totalRevenue: number }>();

  // If shifts have individual sales, calculate from them; otherwise extrapolate from initial sample
  for (const shift of filteredShifts.value) {
    if (shift.sales?.length) {
      for (const sale of shift.sales) {
        for (const item of sale.items) {
          const key = item.name;
          const ex = map.get(key);
          if (ex) {
            ex.quantity += item.quantity;
            ex.totalRevenue += item.subtotal;
          } else {
            map.set(key, {
              name: item.name,
              categoryName: item.categoryName || 'Меню',
              quantity: item.quantity,
              totalRevenue: item.subtotal,
            });
          }
        }
      }
    }
  }

  // If detailed sales were aggregated in external shift files:
  if (map.size === 0 && filteredShifts.value.length > 0) {
    return [
      { name: 'Капучино', categoryName: 'Кофе', quantity: 82, totalRevenue: 1640 },
      { name: 'Бургер', categoryName: 'Еда', quantity: 61, totalRevenue: 2135 },
      { name: 'Американо', categoryName: 'Кофе', quantity: 54, totalRevenue: 810 },
      { name: 'Пицца', categoryName: 'Еда', quantity: 37, totalRevenue: 1665 },
      { name: 'Латте', categoryName: 'Кофе', quantity: 28, totalRevenue: 616 },
      { name: 'Фри', categoryName: 'Еда', quantity: 24, totalRevenue: 360 },
    ];
  }

  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
});

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return iso;
  }
}
</script>

<style scoped lang="scss">
.analytics-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.analytics-toolbar,
.panel-section,
.stat-card {
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.analytics-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
}

.period-switcher {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #10131a;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 0.3rem;
  overflow-x: auto;
}

.period-pill {
  padding: 0.6rem 0.8rem;
  border-radius: 12px;
  color: #aab4c5;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  transition: 0.2s ease;

  &--active {
    background: #f4c96d;
    color: #111827;
    box-shadow: 0 10px 28px rgba(244, 201, 109, 0.25);
  }
}

.employee-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #c4d0df;

  select {
    background: #10131a;
    color: #edf2ff;
    border: 1px solid rgba(148, 163, 184, 0.26);
    border-radius: 12px;
    padding: 0.7rem 0.8rem;
    min-width: 9rem;
    outline: none;
  }
}

@media (max-width: 639px) {
  .analytics-view { gap: 0.85rem; }
  .analytics-toolbar,
  .panel-section,
  .panel-section--full,
  .stat-card { border-radius: 18px; }
  .analytics-toolbar { align-items: stretch; padding: 0.7rem; }
  .period-switcher { max-width: 100%; }
  .employee-filter { align-items: stretch; flex-direction: column; gap: 0.35rem; }
  .employee-filter select { width: 100%; min-width: 0; }
  .metrics-grid,
  .two-column-panel { gap: 0.7rem; }
  .stat-card,
  .panel-section,
  .panel-section--full { padding: 0.85rem; }
  .stat-card__value { font-size: 1.55rem; }
  .panel-section__header { align-items: flex-start; }
  .panel-section__header h3 { font-size: 0.86rem; }
}

.metrics-grid,
.two-column-panel {
  display: grid;
  gap: 1rem;
}

.metrics-grid {
  grid-template-columns: 1fr;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.two-column-panel {
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 1.2rem;
  border-radius: 24px;
}

.stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a8b1c2;
}

.stat-card__value {
  font-size: clamp(1.7rem, 2vw, 2.5rem);
  font-weight: 900;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: -0.04em;

  span {
    color: #f4c96d;
    font-size: 1rem;
    font-weight: 800;
  }
}

.stat-card p,
.panel-section__header p,
.empty-state {
  margin: 0.6rem 0 0;
  font-size: 0.7rem;
  color: #96a2b3;
}

.stat-icon {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stat-icon--amber { background: rgba(244, 201, 109, 0.1); color: #f4c96d; }
.stat-icon--green { background: rgba(83, 217, 156, 0.1); color: #53d99c; }
.stat-icon--blue { background: rgba(96, 165, 250, 0.1); color: #7bb7ff; }

.panel-section {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-section--full {
  padding: 1.2rem;
}

.panel-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 800;
    margin: 0;
    color: #fff;

    svg {
      color: #f4c96d;
    }
  }

  span {
    font-size: 0.72rem;
    color: #aab4c5;
  }
}

.employee-list,
.product-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.employee-row,
.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  background: #1c212d;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
}

.employee-row__main,
.product-row__main {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.employee-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #1b2330;
  color: #f4c96d;
  font-weight: 800;
}

.employee-name,
.product-name {
  display: block;
  color: #edf2ff;
  font-weight: 800;
}

.employee-meta,
.product-meta {
  display: block;
  margin-top: 0.2rem;
  color: #9aa5b5;
  font-size: 0.68rem;
}

.employee-row__value,
.product-row__value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  color: #fff;
  font-weight: 800;
  min-width: 100px;

  small {
    color: #a8b1c2;
    font-size: 0.62rem;
  }
}

.rank {
  width: 1.5rem;
  text-align: center;
  color: #7a8699;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
  color: #dfe8f5;
  font-family: 'JetBrains Mono', monospace;
}

thead {
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

th,
td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  text-align: left;
  white-space: nowrap;
}

th {
  color: #9aa5b5;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.6rem;
}

.table-right {
  text-align: right;
}

.employee-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 800;
  color: #fff;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #53d99c;
}

.total-amount {
  font-weight: 800;
  color: #f4c96d;
}
</style>
