<template>
  <div class="admin-dashboard">
    <header class="admin-header">
      <div class="admin-header__brand">
        <div class="admin-header__icon">
          <ShieldAlert class="icon icon--sm" />
        </div>
        <div>
          <div class="admin-header__title-row">
            <h1>Панель администратора</h1>
            <span class="admin-badge">ADMIN</span>
          </div>
          <p>{{ store.settings.cafeName }} • Каталог v{{ store.catalogVersion }}</p>
        </div>
      </div>

      <button id="btn-return-to-pos" type="button" class="admin-header__button" @click="$emit('switch-to-cashier')">
        <ArrowLeft class="icon icon--xs" />
        <span>В режим кассы POS</span>
      </button>
    </header>

    <nav class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :id="`admin-tab-${tab.id}`"
        type="button"
        @click="activeTab = tab.id"
        class="admin-tab"
        :class="activeTab === tab.id ? 'admin-tab--active' : ''"
        :aria-label="tab.label"
        :title="tab.label"
      >
        <component :is="tab.icon" class="icon icon--xs" />
        <span class="admin-tab-span">{{ tab.label }}</span>
      </button>
    </nav>

    <main class="admin-content">
      <AdminAnalytics v-if="activeTab === 'analytics'" />
      <AdminCatalogEditor v-else-if="activeTab === 'catalog'" />
      <AdminCatalogExport v-else-if="activeTab === 'export'" />
      <AdminReportImport v-else-if="activeTab === 'import'" @imported="activeTab = 'analytics'" />
      <AdminEmployees v-else-if="activeTab === 'employees'" />
      <AdminBackup v-else-if="activeTab === 'backup'" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import AdminAnalytics from './AdminAnalytics.vue';
import AdminCatalogEditor from './AdminCatalogEditor.vue';
import AdminCatalogExport from './AdminCatalogExport.vue';
import AdminReportImport from './AdminReportImport.vue';
import AdminEmployees from './AdminEmployees.vue';
import AdminBackup from './AdminBackup.vue';
import {
  ShieldAlert,
  ArrowLeft,
  BarChart3,
  UtensilsCrossed,
  Lock,
  FileCheck2,
  Users,
  HardDrive,
} from 'lucide-vue-next';

defineEmits<{
  (e: 'switch-to-cashier'): void;
}>();

const store = usePosStore();
const activeTab = ref<'analytics' | 'catalog' | 'export' | 'import' | 'employees' | 'backup'>('analytics');

const tabs = [
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'catalog', label: 'Каталог и цены', icon: UtensilsCrossed },
  { id: 'export', label: 'Экспорт каталога (.catalog)', icon: Lock },
  { id: 'import', label: 'Импорт отчётов (.report)', icon: FileCheck2 },
  { id: 'employees', label: 'Сотрудники', icon: Users },
  { id: 'backup', label: 'Резервные копии', icon: HardDrive },
] as const;
</script>

<style scoped lang="scss">
.admin-dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0d1017;
  color: #edf2ff;
}

.admin-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.9rem;
  background: #131722;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.admin-header__brand {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.admin-header__icon {
  width: 2.6rem;
  height: 2.6rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(244, 201, 109, 0.12);
  border: 1px solid rgba(244, 201, 109, 0.2);
  color: #f4c96d;
}

.admin-header__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  h1 {
    margin: 0;
    font-size: 1rem;
    font-weight: 900;
    color: #fff;
  }
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.18rem 0.45rem;
  border: 1px solid rgba(244, 201, 109, 0.2);
  background: rgba(244, 201, 109, 0.08);
  color: #f4c96d;
  font-size: 0.58rem;
  font-weight: 800;
}

.admin-header__brand p {
  margin: 0.2rem 0 0;
  color: #9aa5b5;
  font-size: 0.72rem;
}

.admin-header__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #1d2430;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #e7ecf7;
  border-radius: 14px;
  padding: 0.65rem 0.9rem;
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}

.admin-tabs {
  background: #10131b;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  overflow-x: auto;
  padding: 0.7rem 1rem;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.admin-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 0.7rem 0.9rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: #a9b4c6;
  background: transparent;
  border: 1px solid transparent;

  &--active {
    background: #f4c96d;
    color: #111827;
    box-shadow: 0 10px 25px rgba(244, 201, 109, 0.2);
  }
}

.admin-content {
  flex: 1;
  width: min(100%, 1200px);
  margin: 0 auto;
  padding: 1rem;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .admin-header {
    align-items: flex-start;
    padding: 0.75rem;
  }

  .admin-header__brand { flex: 1 1 100%; }
  .admin-header__brand p { font-size: 0.64rem; }

  .admin-header__button {
    width: 100%;
    justify-content: center;
    min-height: 2.5rem;
  }

  .admin-tabs { 
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: fixed;
    z-index: 40;
    bottom: 20px;
    left: 0.75rem;
    right: 0.75rem;
    width: auto;
    padding: 0.55rem;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 22px;
    background: rgba(18, 23, 34, 0.94);
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(14px);
  }
  .admin-tab {
    width: 2.7rem;
    height: 2.7rem;
    display: inline-flex;
    justify-content: center;
    padding: 0;
    border-radius: 15px;
    font-size: 0;

    .admin-tab-span { display: none; }
  }
  .admin-tab .icon { width: 1.15rem; height: 1.15rem; }
  .admin-content { padding: 0.65rem 0.65rem 6.25rem; }
}

.icon {
  display: inline-block;
  vertical-align: middle;
}

.icon--xs { width: 0.9rem; height: 0.9rem; }
.icon--sm { width: 1.2rem; height: 1.2rem; }
</style>
