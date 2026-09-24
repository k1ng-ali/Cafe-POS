<template>
  <div class="catalog-import-modal-backdrop">
    <div id="catalog-import-modal" class="catalog-import-modal">
      <div class="catalog-import-modal__header">
        <div class="catalog-import-modal__title-row">
          <div class="catalog-import-modal__icon">
            <Lock class="icon icon--sm" />
          </div>
          <div>
            <h3>Импорт каталога</h3>
            <p>Файл <span>.catalog</span> от администратора</p>
          </div>
        </div>
        <button type="button" class="close-button" @click="$emit('close')">
          <X class="icon icon--sm" />
        </button>
      </div>

      <div class="catalog-dropzone" :class="rawFile ? 'catalog-dropzone--filled' : ''" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
        <input ref="fileInputRef" type="file" accept=".catalog,.json" class="hidden-input" @change="handleFileSelected" />
        <div v-if="!rawFile" class="catalog-dropzone__empty">
          <UploadCloud class="icon icon--md" />
          <p>Выберите файл <span>.catalog</span></p>
          <small>или перетащите его сюда из Telegram/WhatsApp</small>
        </div>
        <div v-else class="catalog-dropzone__filled">
          <FileCheck class="icon icon--md catalog-dropzone__check" />
          <p>{{ selectedFileName }}</p>
          <small>Файл успешно загружен</small>
        </div>
      </div>

      <div v-if="catalogFile" class="catalog-metadata">
        <div class="catalog-metadata__row"><span>Кафе:</span><strong>{{ catalogFile.header.cafeName }}</strong></div>
        <div class="catalog-metadata__row"><span>Версия каталога:</span><strong class="version-pill">v{{ catalogFile.header.version }}</strong></div>
        <div class="catalog-metadata__security"><ShieldAlert class="icon icon--xs" /><span>Каталог зашифрован (AES-256-GCM)</span></div>

        <div class="catalog-password-block">
          <label>Введите пароль от администратора:</label>
          <div class="password-wrap">
            <input id="catalog-decrypt-password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Пароль для расшифровки..." @keyup.enter="decryptAndInspect" />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              <Eye v-if="!showPassword" class="icon icon--xs" />
              <EyeOff v-else class="icon icon--xs" />
            </button>
          </div>
          <p v-if="errorText" class="error-message">{{ errorText }}</p>
        </div>

        <button v-if="!catalogDiff" id="btn-decrypt-catalog" type="button" class="decrypt-button" @click="decryptAndInspect" :disabled="!password || isProcessing">
          <KeyRound class="icon icon--xs" />
          <span>{{ isProcessing ? 'Проверка ключа...' : 'Расшифровать и проверить' }}</span>
        </button>
      </div>

      <div v-if="catalogDiff" class="catalog-diff">
        <div class="catalog-diff__header">
          <span>Новая версия каталога:</span>
          <strong>v{{ catalogDiff.oldVersion }} → v{{ catalogDiff.newVersion }}</strong>
        </div>

        <div class="catalog-diff__changes">
          <span>Обнаруженные изменения:</span>
          <div class="catalog-diff__list">
            <div v-for="prod in catalogDiff.addedProducts" :key="prod.id" class="diff-row diff-row--added"><PlusCircle class="icon icon--xs" /><span>+ {{ prod.name }} ({{ prod.price }} {{ store.settings.currency }})</span></div>
            <div v-for="u in catalogDiff.updatedProducts" :key="u.product.id" class="diff-row diff-row--updated"><RefreshCw class="icon icon--xs" /><span>{{ u.product.name }}: {{ u.oldPrice }} → {{ u.newPrice }} {{ store.settings.currency }}</span></div>
            <div v-for="r in catalogDiff.removedProducts" :key="r.id" class="diff-row diff-row--removed"><MinusCircle class="icon icon--xs" /><span>- {{ r.name }}</span></div>
            <div v-if="catalogDiff.addedProducts.length === 0 && catalogDiff.updatedProducts.length === 0 && catalogDiff.removedProducts.length === 0" class="diff-row diff-row--neutral">Цены и состав товаров не изменились (синхронизация метаданных).</div>
          </div>
        </div>

        <button id="btn-apply-catalog-update" type="button" class="apply-button" @click="applyUpdate">
          <Check class="icon icon--xs" />
          <span>Обновить локальный каталог до v{{ catalogDiff.newVersion }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.catalog-import-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.85);
  overflow-y: auto;
}

.catalog-import-modal {
  width: min(100%, 30rem);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 28px;
  padding: 1.4rem;
  margin: 2rem 0;
  color: #edf2ff;
}

.catalog-import-modal__header,
.catalog-import-modal__title-row,
.catalog-metadata__row,
.catalog-diff__header,
.catalog-password-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.catalog-import-modal__header {
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.catalog-import-modal__title-row {
  gap: 0.8rem;
}

.catalog-import-modal__icon {
  width: 2.6rem;
  height: 2.6rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(244, 201, 109, 0.1);
  border: 1px solid rgba(244, 201, 109, 0.2);
  color: #f4c96d;
}

.catalog-import-modal__header h3 { margin: 0; font-size: 1.1rem; color: #fff; }
.catalog-import-modal__header p { margin: 0.2rem 0 0; color: #9aa7ba; font-size: 0.68rem; }
.catalog-import-modal__header p span { color: #f4c96d; }

.close-button {
  width: 2rem;
  height: 2rem;
  border-radius: 12px;
  color: #b3bfd3;
  background: transparent;
}

.catalog-dropzone {
  border: 2px dashed rgba(148, 163, 184, 0.26);
  border-radius: 20px;
  padding: 1.2rem 1rem;
  text-align: center;
  background: #1c222e;
  cursor: pointer;

  &--filled {
    border-color: rgba(244, 201, 109, 0.6);
    background: rgba(244, 201, 109, 0.04);
  }
}

.catalog-dropzone__empty,
.catalog-dropzone__filled {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.catalog-dropzone p,
.catalog-dropzone small,
.catalog-metadata__row span,
.catalog-password-block label,
.error-message {
  margin: 0;
}

.catalog-dropzone p { font-size: 0.72rem; font-weight: 800; color: #e8edf7; }
.catalog-dropzone p span { color: #f4c96d; }
.catalog-dropzone small { font-size: 0.62rem; color: #9aa7ba; }
.catalog-dropzone__check { color: #7fe7bc; }

.catalog-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  background: #1e2533;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 0.9rem;
}

.catalog-metadata__row {
  gap: 0.7rem;
  font-size: 0.68rem;
  color: #aab5c4;

  strong {
    color: #fff;
    font-size: 0.7rem;
  }
}

.version-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(244, 201, 109, 0.08);
  border: 1px solid rgba(244, 201, 109, 0.2);
  color: #f4c96d;
  padding: 0.25rem 0.5rem;
}

.catalog-metadata__security {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  font-size: 0.7rem;
  color: #f4c96d;
}

.catalog-password-block {
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

.catalog-password-block label {
  font-size: 0.68rem;
  color: #dfeafc;
  font-weight: 700;
}

.password-wrap {
  position: relative;

  input {
    width: 100%;
    min-height: 2.7rem;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: #0e141d;
    color: #edf2ff;
    padding: 0.7rem 2.6rem 0.7rem 0.8rem;
    font-size: 0.72rem;
    outline: none;
  }
}

.password-toggle {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: #aab4c5;
}

.error-message {
  color: #ffafbc;
  font-size: 0.66rem;
}

.decrypt-button,
.apply-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.8rem;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 900;
}

.decrypt-button {
  background: #f4c96d;
  color: #111827;
  border: 1px solid rgba(244, 201, 109, 0.35);
}

.catalog-diff {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 20px;
  padding: 0.9rem;
}

.catalog-diff__header {
  gap: 0.8rem;
  font-size: 0.68rem;
  color: #9fe9cb;

  strong {
    font-size: 0.68rem;
    color: #fff;
  }
}

.catalog-diff__changes {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.68rem;
  color: #dfeafc;
}

.catalog-diff__list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-height: 9rem;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
}

.diff-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.diff-row--added { color: #7fe7bc; }
.diff-row--updated { color: #f4c96d; }
.diff-row--removed { color: #fca5a5; }
.diff-row--neutral { color: #d0d8ea; }

.apply-button {
  background: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #09160f;
}

.hidden-input { display: none; }
.icon { display: inline-block; }
.icon--xs { width: 0.85rem; height: 0.85rem; }
.icon--sm { width: 1.1rem; height: 1.1rem; }
.icon--md { width: 1.7rem; height: 1.7rem; }
</style>

<script setup lang="ts">
import { ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { EncryptedCatalogFile, CatalogDiff } from '../../types';
import {
  Lock,
  X,
  UploadCloud,
  FileCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound,
  PlusCircle,
  RefreshCw,
  MinusCircle,
  Check,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const store = usePosStore();
const fileInputRef = ref<HTMLInputElement | null>(null);
const rawFile = ref<File | null>(null);
const selectedFileName = ref('');
const catalogFile = ref<EncryptedCatalogFile | null>(null);
const password = ref('');
const showPassword = ref(false);
const errorText = ref('');
const isProcessing = ref(false);
const catalogDiff = ref<CatalogDiff | null>(null);
const decryptedPayload = ref<any>(null);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files?.[0]) {
    parseFile(target.files[0]);
  }
}

function handleDrop(e: DragEvent) {
  if (e.dataTransfer?.files?.[0]) {
    parseFile(e.dataTransfer.files[0]);
  }
}

function parseFile(file: File) {
  rawFile.value = file;
  selectedFileName.value = file.name;
  errorText.value = '';
  catalogDiff.value = null;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result as string);
      if (parsed.format !== 'pos.catalog.v1') {
        errorText.value = 'Файл не является корректным зашифрованным каталогом (format != pos.catalog.v1)';
        catalogFile.value = null;
        return;
      }
      catalogFile.value = parsed as EncryptedCatalogFile;
    } catch {
      errorText.value = 'Ошибка чтения файла: поврежденный JSON';
      catalogFile.value = null;
    }
  };
  reader.readAsText(file);
}

async function decryptAndInspect() {
  if (!catalogFile.value || !password.value) return;
  isProcessing.value = true;
  errorText.value = '';
  try {
    const { diff, payload } = await store.inspectCatalogFile(catalogFile.value, password.value);
    catalogDiff.value = diff;
    decryptedPayload.value = payload;
  } catch (e: any) {
    errorText.value = e.message || 'Неверный пароль или ошибка расшифровки файла';
  } finally {
    isProcessing.value = false;
  }
}

function applyUpdate() {
  if (!decryptedPayload.value) return;
  store.applyDecryptedCatalog(decryptedPayload.value);
  emit('close');
}
</script>
