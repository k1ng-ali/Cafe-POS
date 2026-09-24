<template>
  <div class="catalog-export">
    <div class="panel catalog-export__header">
      <div class="panel-icon panel-icon--amber">
        <ShieldCheck class="icon icon--sm" />
      </div>
      <div>
        <h2>Экспорт защищённого каталога</h2>
        <p>Создание зашифрованного файла <span>.catalog</span> для кассиров</p>
      </div>
    </div>

    <div class="panel catalog-export__body">
      <div class="meta-grid">
        <div class="meta-card">
          <span>ID Заведения:</span>
          <strong>{{ store.settings.cafeId }}</strong>
        </div>
        <div class="meta-card">
          <span>Название кафе:</span>
          <strong>{{ store.settings.cafeName }}</strong>
        </div>
        <div class="meta-card meta-card--accent">
          <span>Текущая версия:</span>
          <strong>v{{ store.catalogVersion }}</strong>
        </div>
        <div class="meta-card">
          <span>Товаров в каталоге:</span>
          <strong>{{ store.products.length }} шт.</strong>
        </div>
        <div class="meta-card">
          <span>Категорий:</span>
          <strong>{{ store.categories.length }}</strong>
        </div>
        <div class="meta-card">
          <span>Шифрование:</span>
          <strong>AES-256-GCM</strong>
        </div>
      </div>

      <div class="password-block">
        <label>🔐 Пароль для защиты каталога (передаётся сотруднику):</label>
        <div class="password-field">
          <input id="export-catalog-password" v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Введите пароль (например, coffee2026)" />
          <button type="button" class="password-toggle" @click="showPassword = !showPassword">
            <Eye v-if="!showPassword" class="icon icon--xs" />
            <EyeOff v-else class="icon icon--xs" />
          </button>
        </div>
        <p>Пароль используется для генерации криптоключа PBKDF2 (100 000 итераций). Внутри файла пароль не хранится.</p>
      </div>

      <button id="btn-do-export-catalog" type="button" class="export-button" @click="exportCatalogFile" :disabled="!password || isExporting">
        <DownloadCloud class="icon icon--sm" />
        <span>{{ isExporting ? 'Шифрование каталога...' : `Экспортировать ${exportedFilename}` }}</span>
      </button>

      <div v-if="lastExportedBlob" class="share-box">
        <div class="share-box__title">
          <CheckCircle2 class="icon icon--xs" />
          <span>Файл каталога успешно сгенерирован и скачан!</span>
        </div>
        <p>Отправьте файл <code>{{ exportedFilename }}</code> бариста или кассиру через любой мессенджер вместе с паролем.</p>
        <button type="button" class="share-button" @click="copyTelegramInstructions">
          <Send class="icon icon--xs" />
          <span>Скопировать инструкцию для Telegram/WhatsApp</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import { ShieldCheck, Eye, EyeOff, DownloadCloud, CheckCircle2, Send } from 'lucide-vue-next';

const store = usePosStore();
const password = ref('coffee2026');
const showPassword = ref(false);
const isExporting = ref(false);
const lastExportedBlob = ref<boolean>(false);

const exportedFilename = computed(() => {
  const cleanCafe = store.settings.cafeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${cleanCafe}-v${store.catalogVersion}.catalog`;
});

async function exportCatalogFile() {
  if (!password.value.trim()) {
    store.showToast('Введите пароль для защиты каталога', 'error');
    return;
  }
  isExporting.value = true;
  try {
    const { file, filename } = await store.exportEncryptedCatalog(password.value);

    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    lastExportedBlob.value = true;
    store.showToast(`Файл ${filename} успешно зашифрован и сохранен!`, 'success');
  } catch (e: any) {
    store.showToast(e.message || 'Ошибка шифрования каталога', 'error');
  } finally {
    isExporting.value = false;
  }
}

function copyTelegramInstructions() {
  const text = [
    `☕ Обновление меню ${store.settings.cafeName} (версия v${store.catalogVersion})`,
    `Файл: ${exportedFilename.value}`,
    `Пароль для импорта: ${password.value}`,
    '',
    'Инструкция:',
    '1. Откройте POS на кассе',
    '2. Нажмите кнопку "Каталог" вверху',
    '3. Загрузите файл и введите пароль выше',
    '4. Нажмите "Обновить локальный каталог"',
  ].join('\n');

  navigator.clipboard.writeText(text);
  store.showToast('Инструкция скопирована в буфер', 'success');
}
</script>

<style scoped lang="scss">
.catalog-export {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  max-width: 54rem;
  margin: 0 auto;
}

.panel {
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.catalog-export__header,
.catalog-export__body {
  padding: 1.2rem;
}

.catalog-export__header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.panel-icon {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  flex-shrink: 0;
}

.panel-icon--amber { background: rgba(244, 201, 109, 0.12); border: 1px solid rgba(244, 201, 109, 0.2); color: #f4c96d; }

.catalog-export__header h2 {
  margin: 0;
  color: #fff;
  font-size: 1.2rem;
}

.catalog-export__header p {
  margin: 0.3rem 0 0;
  color: #98a3b7;
  font-size: 0.72rem;
}

.catalog-export__header p span {
  color: #f4c96d;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.meta-card {
  background: #1c222e;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  span {
    font-size: 0.62rem;
    color: #9aa5b5;
  }

  strong {
    font-size: 0.72rem;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
  }
}

.meta-card--accent {
  background: rgba(244, 201, 109, 0.08);
  border-color: rgba(244, 201, 109, 0.25);

  strong {
    color: #f4c96d;
  }
}

.password-block {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;

  label {
    font-size: 0.72rem;
    font-weight: 800;
    color: #e6edf7;
  }

  p {
    margin: 0;
    font-size: 0.66rem;
    color: #9aa5b5;
  }
}

.password-field {
  position: relative;

  input {
    width: 100%;
    min-height: 2.9rem;
    padding: 0.8rem 3rem 0.8rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: #0e141d;
    color: #fff;
    font-size: 0.8rem;
    outline: none;
  }
}

.password-toggle {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: #aab4c5;
}

.export-button,
.share-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 3rem;
  border-radius: 16px;
  font-size: 0.76rem;
  font-weight: 900;
}

.export-button {
  margin-top: 1rem;
  background: #f4c96d;
  color: #111827;
  border: 1px solid rgba(244, 201, 109, 0.35);
}

.share-box {
  margin-top: 1rem;
  padding: 0.9rem;
  border-radius: 16px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.28);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  p {
    margin: 0;
    font-size: 0.68rem;
    color: #d4deeb;
    line-height: 1.5;
  }
}

.share-box__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #85f0c1;
  font-size: 0.7rem;
  font-weight: 800;
}

code {
  font-family: 'JetBrains Mono', monospace;
  color: #f7d27c;
  font-size: 0.64rem;
}

.share-button {
  background: #1d2430;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #edf2ff;
}

@media (max-width: 639px) {
  .catalog-export { gap: 0.85rem; }
  .catalog-export__header,
  .catalog-export__body { padding: 0.9rem; }
  .catalog-export__header { align-items: flex-start; }
  .catalog-export__header h2 { font-size: 1rem; }
  .catalog-export__header p { font-size: 0.66rem; line-height: 1.5; }
  .meta-grid { gap: 0.5rem; }
  .meta-card { padding: 0.6rem; }
  .meta-card strong { overflow-wrap: anywhere; }
}
</style>
