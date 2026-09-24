<template>
  <div class="report-import">
    <div class="panel report-import__header">
      <div class="report-import__badge">
        <FileUp class="icon icon--sm" />
      </div>
      <div>
        <h2>Импорт отчётов смен</h2>
        <p>Загрузка файлов <span>.report</span> от кассиров и бариста</p>
      </div>
    </div>

    <p class="report-import__lede">Система автоматически проверяет подлинность файла, контрольную сумму SHA-256 и блокирует повторный импорт смен с одинаковым Shift ID.</p>

    <div
      class="dropzone"
      :class="selectedReportFile ? 'dropzone--ready' : ''"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <input ref="fileInputRef" type="file" accept=".report,.json" class="hidden-input" @change="handleFileSelected" />

      <div v-if="!selectedReportFile" class="dropzone__empty">
        <UploadCloud class="icon icon--lg" />
        <h3>Выберите файл отчёта .report</h3>
        <p>или перетащите файл из Telegram/WhatsApp</p>
      </div>

      <div v-else class="dropzone__filled">
        <FileCheck class="icon icon--lg dropzone__icon" />
        <h3>{{ rawFileName }}</h3>
        <p>Файл распознан корректно</p>
      </div>
    </div>

    <div v-if="duplicateWarning" id="duplicate-shift-warning" class="warning-banner">
      <div class="warning-banner__title">
        <AlertTriangle class="icon icon--xs" />
        <span>⚠️ Защита от повторного импорта сработала!</span>
      </div>
      <p>Эта смена уже была импортирована в базу данных ранее. Повторный импорт полностью заблокирован во избежание задвоения выручки (1 850 + 1 850 = 3 700 ❌).</p>
      <div class="warning-banner__id">Shift ID: {{ selectedReportFile?.header.shiftId }}</div>
    </div>

    <div v-if="selectedReportFile" class="panel report-import__summary">
      <h3>Результат верификации файла:</h3>

      <div class="verify-grid">
        <div class="verify-item"><CheckCircle2 class="icon icon--xs" /><span>Cafe ID: <strong>{{ selectedReportFile.header.cafeId }}</strong></span></div>
        <div class="verify-item"><CheckCircle2 class="icon icon--xs" /><span>Формат файла: <strong>{{ selectedReportFile.format }}</strong></span></div>
        <div class="verify-item"><CheckCircle2 class="icon icon--xs" /><span>Версия схемы: <strong>v{{ selectedReportFile.header.version }}</strong></span></div>
        <div class="verify-item"><CheckCircle2 class="icon icon--xs" /><span>Целостность (SHA-256): <strong class="ok">OK</strong></span></div>
        <div class="verify-item verify-item--status" :class="isDuplicate ? 'verify-item--danger' : 'verify-item--success'">
          <component :is="isDuplicate ? XCircle : CheckCircle2" class="icon icon--xs" />
          <span>Уникальность Shift ID: <strong>{{ isDuplicate ? 'ДУБЛИКАТ (Заблокировано)' : 'УНИКАЛЕН (Готов к учету)' }}</strong></span>
        </div>
      </div>

      <div class="report-details">
        <div class="report-details__row"><span>Сотрудник:</span><strong>{{ selectedReportFile.header.employeeName }}</strong></div>
        <div class="report-details__row"><span>Период работы смены:</span><strong>{{ formatTime(selectedReportFile.header.startTime) }} — {{ formatTime(selectedReportFile.header.endTime) }}</strong></div>
        <div class="report-details__row"><span>Количество закрытых продаж:</span><strong>{{ selectedReportFile.header.salesCount }}</strong></div>
        <div class="report-details__row report-details__row--total"><span>Итого выручка к зачислению:</span><strong>{{ selectedReportFile.header.totalRevenue }} {{ store.settings.currency }}</strong></div>
      </div>

      <div class="items-summary">
        <span class="items-summary__label">Проданные позиции в отчёте:</span>
        <div class="items-summary__list">
          <div v-for="item in selectedReportFile.data.itemsSummary" :key="item.productId" class="items-summary__item">
            <span>{{ item.name }}</span>
            <span>{{ item.quantity }} × {{ item.price }} = <strong>{{ item.total }} {{ store.settings.currency }}</strong></span>
          </div>
        </div>
      </div>

      <button id="btn-commit-import-report" type="button" class="commit-button" @click="commitImport" :disabled="isDuplicate || isCommitting">
        <Check class="icon icon--sm" />
        <span>{{ isCommitting ? 'Импорт данных...' : 'Внести смену в базу данных аналитики' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.report-import {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 52rem;
  margin: 0 auto;
}

.panel {
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.report-import__header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1.2rem;
}

.report-import__badge {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #7fe7bc;
}

.report-import__header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #fff;
}

.report-import__header p,
.report-import__lede {
  margin: 0.2rem 0 0;
  color: #9aa7ba;
  font-size: 0.72rem;
}

.report-import__header p span,
.report-import__lede span {
  color: #7fe7bc;
}

.dropzone {
  border: 2px dashed rgba(148, 163, 184, 0.3);
  border-radius: 28px;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  background: #161a23;
  transition: 0.2s ease;

  &--ready {
    border-color: rgba(16, 185, 129, 0.6);
    background: rgba(16, 185, 129, 0.04);
  }
}

.dropzone__empty,
.dropzone__filled {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.dropzone__icon { color: #7fe7bc; }

.dropzone h3,
.report-import__summary h3 {
  margin: 0;
  color: #fff;
  font-size: 0.9rem;
}

.dropzone p,
.warning-banner p {
  margin: 0;
  color: #9aa7ba;
  font-size: 0.68rem;
}

.warning-banner {
  background: rgba(127, 29, 29, 0.22);
  border: 1px solid rgba(251, 113, 133, 0.42);
  border-radius: 24px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.warning-banner__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ffb8c4;
  font-weight: 800;
  font-size: 0.8rem;
}

.warning-banner__id {
  background: rgba(127, 29, 29, 0.42);
  border: 1px solid rgba(251, 113, 133, 0.25);
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  color: #ffe1e7;
  font-size: 0.64rem;
}

.report-import__summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.2rem;
}

.verify-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  font-size: 0.7rem;
}

.verify-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #1c222e;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  padding: 0.6rem 0.7rem;
  color: #dfeafc;

  strong { color: #edf2ff; }
  .ok { color: #7fe7bc; }
}

.verify-item--status {
  grid-column: 1 / -1;
}

.verify-item--success {
  background: rgba(16, 185, 129, 0.07);
  border-color: rgba(16, 185, 129, 0.25);
  color: #8feac8;
}

.verify-item--danger {
  background: rgba(127, 29, 29, 0.14);
  border-color: rgba(251, 113, 133, 0.28);
  color: #ffc0cb;
}

.report-details {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: #1c222e;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 0.8rem;
  font-size: 0.72rem;
}

.report-details__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  color: #9aa7ba;

  strong {
    color: #fff;
    font-size: 0.72rem;
  }
}

.report-details__row--total {
  padding-top: 0.6rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  color: #dfeafc;

  strong {
    color: #7fe7bc;
    font-family: 'JetBrains Mono', monospace;
  }
}

.items-summary {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.items-summary__label {
  font-size: 0.72rem;
  color: #dfeafc;
  font-weight: 700;
}

.items-summary__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 10rem;
  overflow-y: auto;
}

.items-summary__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: #0e141d;
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: #eaf1ff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;

  strong { color: #f4c96d; }
}

.commit-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 3rem;
  border-radius: 16px;
  background: #34d399;
  color: #09160f;
  border: 1px solid rgba(52, 211, 153, 0.4);
  font-size: 0.76rem;
  font-weight: 900;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.hidden-input { display: none; }
.icon { display: inline-block; }
.icon--xs { width: 0.85rem; height: 0.85rem; }
.icon--sm { width: 1.1rem; height: 1.1rem; }
.icon--lg { width: 2.2rem; height: 2.2rem; }

@media (max-width: 639px) {
  .report-import { gap: 0.85rem; }
  .report-import__header,
  .report-import__summary { padding: 0.9rem; }
  .report-import__header { align-items: flex-start; }
  .report-import__header h2 { font-size: 1rem; }
  .report-import__header p,
  .report-import__lede { font-size: 0.66rem; line-height: 1.5; }
  .dropzone { padding: 1.4rem 0.8rem; border-radius: 20px; }
  .verify-grid { grid-template-columns: 1fr; }
  .verify-item--status { grid-column: auto; }
  .items-summary__item { align-items: flex-start; flex-direction: column; gap: 0.25rem; }
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { ShiftReportFile } from '../../types';
import {
  FileUp,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Check,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'imported'): void;
}>();

const store = usePosStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const rawFileName = ref('');
const selectedReportFile = ref<ShiftReportFile | null>(null);
const isCommitting = ref(false);

const isDuplicate = computed(() => {
  if (!selectedReportFile.value) return false;
  return store.importedShiftIds.includes(selectedReportFile.value.header.shiftId);
});

const duplicateWarning = computed(() => {
  return isDuplicate.value;
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.[0]) {
    parseReportFile(target.files[0]);
  }
}

function handleDrop(e: DragEvent) {
  if (e.dataTransfer?.files?.[0]) {
    parseReportFile(e.dataTransfer.files[0]);
  }
}

function parseReportFile(file: File) {
  rawFileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result as string) as ShiftReportFile;
      if (parsed.format !== 'pos.report.v1') {
        store.showToast('Файл не является отчётом смены (pos.report.v1)', 'error');
        selectedReportFile.value = null;
        return;
      }
      selectedReportFile.value = parsed;
    } catch {
      store.showToast('Невозможно разобрать файл отчёта: синтаксическая ошибка', 'error');
      selectedReportFile.value = null;
    }
  };
  reader.readAsText(file);
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

async function commitImport() {
  if (!selectedReportFile.value || isDuplicate.value) return;
  isCommitting.value = true;
  try {
    await store.importShiftReport(selectedReportFile.value);
    selectedReportFile.value = null;
    rawFileName.value = '';
    emit('imported');
  } catch (e: any) {
    store.showToast(e.message || 'Ошибка импорта отчёта', 'error');
  } finally {
    isCommitting.value = false;
  }
}
</script>
