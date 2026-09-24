<template>
  <div class="backup-page">
    <div class="backup-header panel">
      <div class="backup-header__icon panel-icon panel-icon--blue">
        <DatabaseBackup class="icon icon--sm" />
      </div>
      <div>
        <h2>Резервное копирование и экспорт отчетов</h2>
        <p>Полный бэкап базы данных, экспорт продаж в CSV и управление хранилищем</p>
      </div>
    </div>

    <div class="backup-grid">
      <div class="backup-card panel">
        <div class="backup-card__content">
          <div class="panel-icon panel-icon--purple">
            <HardDrive class="icon icon--sm" />
          </div>
          <h3>Полный бэкап (cafe-backup.json)</h3>
          <p>Сохраняет каталог, историю всех смен, список сотрудников и настройки заведения в один защищенный файл.</p>
        </div>

        <button id="btn-download-db-backup" type="button" class="backup-button backup-button--purple" @click="downloadDbBackup">
          <Download class="icon icon--xs" />
          <span>Скачать резервную копию</span>
        </button>
      </div>

      <div class="backup-card panel">
        <div class="backup-card__content">
          <div class="panel-icon panel-icon--green">
            <FileSpreadsheet class="icon icon--sm" />
          </div>
          <h3>Экспорт отчёта в CSV (Excel)</h3>
          <p>Таблица всех закрытых продаж со всеми чеками, сотрудниками, товарами и методами оплаты.</p>
        </div>

        <button id="btn-export-sales-csv" type="button" class="backup-button backup-button--green" @click="exportSalesCsv">
          <FileText class="icon icon--xs" />
          <span>Скачать sales.csv</span>
        </button>
      </div>
    </div>

    <div class="restore-panel panel">
      <h3>Восстановление из резервной копии</h3>
      <p>Выберите ранее сохраненный файл <code>cafe-backup.json</code> для восстановления базы данных на этом устройстве.</p>

      <div class="restore-actions">
        <input ref="restoreInputRef" type="file" accept=".json" class="hidden-input" @change="handleRestoreFileSelected" />
        <button type="button" class="restore-button" @click="triggerRestoreInput">
          <Upload class="icon icon--xs" />
          <span>Выбрать файл бэкапа</span>
        </button>

        <button id="btn-reset-demo" type="button" class="reset-button" @click="resetDemo">
          <RefreshCcw class="icon icon--xs" />
          <span>Сброс к демо-данным</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import {
  DatabaseBackup,
  HardDrive,
  Download,
  FileSpreadsheet,
  FileText,
  Upload,
  RefreshCcw,
} from 'lucide-vue-next';

const store = usePosStore();
const restoreInputRef = ref<HTMLInputElement | null>(null);

function downloadDbBackup() {
  const backupData = {
    app: 'CoffeePOS',
    format: 'coffeepos.backup.v1',
    exportedAt: new Date().toISOString(),
    settings: store.settings,
    isConfigured: store.isConfigured,
    isCatalogImported: store.isCatalogImported,
    catalogVersion: store.catalogVersion,
    categories: store.categories,
    products: store.products,
    employees: store.employees,
    currentEmployee: store.currentEmployee,
    activeShift: store.activeShift,
    historicalShifts: store.historicalShifts,
    importedShiftIds: store.importedShiftIds,
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coffeepos-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  store.showToast('Резервная копия создана и сохранена', 'success');
}

function exportSalesCsv() {
  const rows: string[] = [];
  rows.push(['Shift ID', 'Сотрудник', 'Дата', 'Время', 'Товар', 'Количество', 'Цена', 'Сумма', 'Оплата'].join(';'));

  for (const shift of store.historicalShifts) {
    if (shift.sales?.length) {
      for (const sale of shift.sales) {
        for (const item of sale.items) {
          rows.push([
            shift.id,
            shift.employeeName,
            sale.createdAt.split('T')[0],
            sale.createdAt.split('T')[1].substring(0, 5),
            `"${item.name}"`,
            item.quantity,
            item.price,
            item.subtotal,
            sale.paymentMethod,
          ].join(';'));
        }
      }
    }
  }

  // UTF-8 BOM so Excel opens Cyrillic characters properly
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  store.showToast('Отчёт sales.csv успешно сгенерирован', 'success');
}

function triggerRestoreInput() {
  restoreInputRef.value?.click();
}

function handleRestoreFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files?.[0]) return;

  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string);
      if (data.settings) store.settings = data.settings;
      if (typeof data.isConfigured === 'boolean') store.isConfigured = data.isConfigured;
      if (typeof data.isCatalogImported === 'boolean') store.isCatalogImported = data.isCatalogImported;
      if (data.catalogVersion) store.catalogVersion = data.catalogVersion;
      if (data.categories) store.categories = data.categories;
      if (data.products) store.products = data.products;
      if (Array.isArray(data.employees)) store.employees = data.employees;
      if ('currentEmployee' in data) store.currentEmployee = data.currentEmployee;
      if ('activeShift' in data) store.activeShift = data.activeShift;
      if (data.historicalShifts) store.historicalShifts = data.historicalShifts;
      if (data.importedShiftIds) store.importedShiftIds = data.importedShiftIds;
      store.saveToStorage();
      store.showToast('База данных успешно восстановлена из копии!', 'success');
    } catch {
      store.showToast('Не удалось восстановить бэкап: поврежденный файл', 'error');
    }
  };
  reader.readAsText(file);
}

function resetDemo() {
  if (confirm('Сбросить базу данных к исходным демо-данным?')) {
    store.resetAllToDemo();
  }
}
</script>

<style scoped lang="scss">
.backup-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 52rem;
  margin: 0 auto;
}

.panel {
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.backup-header,
.restore-panel {
  padding: 1.3rem 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.backup-header h2,
.restore-panel h3 {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.3;
  color: #fff;
}

.backup-header p,
.restore-panel p {
  margin: 0.25rem 0 0;
  color: #98a4b8;
  font-size: 0.72rem;
}

.panel-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
}

.panel-icon--blue { background: rgba(96, 165, 250, 0.1); color: #7bb7ff; border: 1px solid rgba(96, 165, 250, 0.2); }
.panel-icon--purple { background: rgba(168, 85, 247, 0.1); color: #d09af9; border: 1px solid rgba(168, 85, 247, 0.25); }
.panel-icon--green { background: rgba(83, 217, 156, 0.1); color: #7de0b1; border: 1px solid rgba(83, 217, 156, 0.2); }

.backup-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.backup-card {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
}

.backup-card__content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.backup-card__content h3 {
  margin: 0;
  font-size: 1rem;
  color: #fff;
}

.backup-card__content p {
  margin: 0;
  color: #a5afc1;
  font-size: 0.72rem;
  line-height: 1.6;
}

.backup-button,
.restore-button,
.reset-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2.8rem;
  border-radius: 16px;
  font-size: 0.72rem;
  font-weight: 800;
}

.backup-button--purple {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: #eed2ff;
}

.backup-button--green {
  background: rgba(83, 217, 156, 0.1);
  border: 1px solid rgba(83, 217, 156, 0.3);
  color: #b8f7d8;
}

.restore-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.restore-button {
  width: auto;
  padding: 0.8rem 1rem;
  background: #1d2430;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #ebeff6;
}

.reset-button {
  width: auto;
  margin-left: auto;
  padding: 0.8rem 1rem;
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(251, 113, 133, 0.35);
  color: #ffb5c0;
}

.hidden-input {
  display: none;
}

code {
  font-family: 'JetBrains Mono', monospace;
  color: #d7dceb;
  font-size: 0.72rem;
}

@media (max-width: 639px) {
  .backup-page { gap: 0.85rem; }
  .backup-header,
  .restore-panel { align-items: flex-start; padding: 0.9rem; }
  .backup-header h2,
  .restore-panel h3 { font-size: 1rem; }
  .backup-header p,
  .restore-panel p { font-size: 0.66rem; line-height: 1.5; }
  .restore-actions { align-items: stretch; flex-direction: column; }
  .restore-button,
  .reset-button { width: 100%; margin-left: 0; }
}
</style>
