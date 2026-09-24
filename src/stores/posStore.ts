import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Product,
  Category,
  Employee,
  CartItem,
  Sale,
  Shift,
  POSSettings,
  PaymentMethod,
  EncryptedCatalogFile,
  ShiftReportFile,
  CatalogDiff,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_EMPLOYEES,
  INITIAL_SETTINGS,
} from '../services/initialData';
import {
  generateUUID,
  encryptCatalog,
  decryptCatalog,
  createShiftReport,
  verifyShiftReport,
} from '../services/crypto';

const STORAGE_KEY = 'coffeepos_store_v1';

export const usePosStore = defineStore('pos', () => {
  // Mode: 'cashier' | 'admin'
  const currentMode = ref<'cashier' | 'admin'>('cashier');
  const isConfigured = ref(false);
  const isCatalogImported = ref(false);

  // Core Data
  const settings = ref<POSSettings>({ ...INITIAL_SETTINGS });
  const catalogVersion = ref<number>(12);
  const categories = ref<Category[]>([...INITIAL_CATEGORIES]);
  const products = ref<Product[]>([...INITIAL_PRODUCTS]);
  const employees = ref<Employee[]>([...INITIAL_EMPLOYEES]);

  // Cashier State
  const currentEmployee = ref<Employee | null>(null);
  const activeShift = ref<Shift | null>(null);
  const cart = ref<CartItem[]>([]);
  const selectedPaymentMethod = ref<PaymentMethod>('cash');
  const lastCompletedSale = ref<Sale | null>(null);

  // Admin / History State
  const historicalShifts = ref<Shift[]>([]);
  const importedShiftIds = ref<string[]>([]);

  // Notifications
  const toast = ref<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    toast.value = { message, type };
    setTimeout(() => {
      if (toast.value?.message === message) {
        toast.value = null;
      }
    }, 4000);
  }

  // Load from LocalStorage
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.settings) settings.value = parsed.settings;
        isConfigured.value = parsed.isConfigured === true || Boolean(parsed.settings?.adminPin);
        isCatalogImported.value = parsed.isCatalogImported === true || Boolean(parsed.products?.length);
        if (typeof parsed.catalogVersion === 'number') catalogVersion.value = parsed.catalogVersion;
        if (Array.isArray(parsed.categories)) categories.value = parsed.categories;
        if (Array.isArray(parsed.products)) products.value = parsed.products;
        if (Array.isArray(parsed.employees)) employees.value = parsed.employees;
        if (parsed.currentEmployee) currentEmployee.value = parsed.currentEmployee;
        if (parsed.activeShift) activeShift.value = parsed.activeShift;
        if (parsed.historicalShifts) historicalShifts.value = parsed.historicalShifts;
        if (parsed.importedShiftIds) importedShiftIds.value = parsed.importedShiftIds;
        return;
      }
    } catch (e) {
      console.error('Failed to load local storage:', e);
    }

    // Fresh installations stay empty until the administrator configures them.
    settings.value = { ...INITIAL_SETTINGS };
    categories.value = [];
    products.value = [];
    employees.value = [];
    catalogVersion.value = 1;
    historicalShifts.value = [];
    importedShiftIds.value = [];
    isConfigured.value = false;
    isCatalogImported.value = false;
    saveToStorage();
  }

  function saveToStorage() {
    try {
      const dataToSave = {
        settings: settings.value,
        isConfigured: isConfigured.value,
        isCatalogImported: isCatalogImported.value,
        catalogVersion: catalogVersion.value,
        categories: categories.value,
        products: products.value,
        employees: employees.value,
        currentEmployee: currentEmployee.value,
        activeShift: activeShift.value,
        historicalShifts: historicalShifts.value,
        importedShiftIds: importedShiftIds.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }

  // Seed sample shifts to make analytics immediately alive
  function seedSampleHistoricalShifts() {
    const todayStr = new Date().toISOString().split('T')[0];
    const shiftAli: Shift = {
      id: 'shift-demo-ali-01',
      cafeId: settings.value.cafeId,
      cafeName: settings.value.cafeName,
      employeeId: 'emp-ali',
      employeeName: 'Али',
      startTime: `${todayStr}T08:30:00.000Z`,
      endTime: `${todayStr}T15:00:00.000Z`,
      status: 'closed',
      salesCount: 47,
      totalRevenue: 1850,
      paymentBreakdown: { cash: 1050, card: 520, qr: 280 },
      sales: [
        {
          id: generateUUID(),
          orderNumber: 101,
          shiftId: 'shift-demo-ali-01',
          employeeId: 'emp-ali',
          employeeName: 'Али',
          items: [
            { productId: 'prod-cappuccino', name: 'Капучино', categoryName: 'Кофе', quantity: 2, price: 20, subtotal: 40 },
            { productId: 'prod-burger', name: 'Бургер', categoryName: 'Еда', quantity: 1, price: 35, subtotal: 35 },
          ],
          totalAmount: 75,
          paymentMethod: 'cash',
          createdAt: `${todayStr}T09:15:00.000Z`,
        },
      ],
    };

    const shiftSaid: Shift = {
      id: 'shift-demo-said-01',
      cafeId: settings.value.cafeId,
      cafeName: settings.value.cafeName,
      employeeId: 'emp-said',
      employeeName: 'Саид',
      startTime: `${todayStr}T15:00:00.000Z`,
      endTime: `${todayStr}T22:30:00.000Z`,
      status: 'closed',
      salesCount: 42,
      totalRevenue: 1720,
      paymentBreakdown: { cash: 820, card: 600, qr: 300 },
      sales: [],
    };

    const shiftMuhammad: Shift = {
      id: 'shift-demo-muh-01',
      cafeId: settings.value.cafeId,
      cafeName: settings.value.cafeName,
      employeeId: 'emp-muhammad',
      employeeName: 'Мухаммад',
      startTime: `${todayStr}T09:00:00.000Z`,
      endTime: `${todayStr}T17:00:00.000Z`,
      status: 'closed',
      salesCount: 37,
      totalRevenue: 1850,
      paymentBreakdown: { cash: 950, card: 500, qr: 400 },
      sales: [],
    };

    historicalShifts.value = [shiftAli, shiftSaid, shiftMuhammad];
    importedShiftIds.value = [shiftAli.id, shiftSaid.id, shiftMuhammad.id];
  }

  // --- Cart Computations ---
  const cartTotalAmount = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  });

  const cartTotalItemsCount = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  // --- Cart Actions ---
  function addToCart(product: Product) {
    if (!product.active) return;
    const existing = cart.value.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.value.push({
        productId: product.id,
        product: { ...product },
        quantity: 1,
      });
    }
  }

  function removeFromCart(productId: string) {
    const idx = cart.value.findIndex((i) => i.productId === productId);
    if (idx !== -1) {
      cart.value.splice(idx, 1);
    }
  }

  function decreaseQuantity(productId: string) {
    const item = cart.value.find((i) => i.productId === productId);
    if (!item) return;
    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      removeFromCart(productId);
    }
  }

  function setQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const item = cart.value.find((i) => i.productId === productId);
    if (item) {
      item.quantity = quantity;
    }
  }

  function clearCart() {
    cart.value = [];
  }

  // --- Cashier / Shifts Actions ---
  function loginEmployee(employee: Employee, enteredPin: string): boolean {
    if (employee.pin === enteredPin) {
      currentEmployee.value = employee;
      saveToStorage();
      showToast(`Добро пожаловать, ${employee.name}!`, 'success');
      return true;
    }
    showToast('Неверный PIN-код сотрудника', 'error');
    return false;
  }

  function logoutEmployee() {
    currentEmployee.value = null;
    clearCart();
    saveToStorage();
  }

  function startShift(): Shift {
    if (!currentEmployee.value) {
      throw new Error('Сотрудник не выбран');
    }
    const newShift: Shift = {
      id: generateUUID(),
      cafeId: settings.value.cafeId,
      cafeName: settings.value.cafeName,
      employeeId: currentEmployee.value.id,
      employeeName: currentEmployee.value.name,
      startTime: new Date().toISOString(),
      status: 'open',
      salesCount: 0,
      totalRevenue: 0,
      paymentBreakdown: { cash: 0, card: 0, qr: 0 },
      sales: [],
    };
    activeShift.value = newShift;
    saveToStorage();
    showToast(`Смена начата в ${formatTime(newShift.startTime)}`, 'success');
    return newShift;
  }

  function closeShift(): Shift | null {
    if (!activeShift.value) return null;
    activeShift.value.status = 'closed';
    activeShift.value.endTime = new Date().toISOString();
    const closed = { ...activeShift.value };

    // Record in local historical shifts as well
    historicalShifts.value.unshift(closed);
    if (!importedShiftIds.value.includes(closed.id)) {
      importedShiftIds.value.push(closed.id);
    }

    activeShift.value = null;
    clearCart();
    saveToStorage();
    showToast(`Смена завершена! Продаж: ${closed.salesCount}, Выручка: ${closed.totalRevenue} ${settings.value.currency}`, 'success');
    return closed;
  }

  function processSale(): Sale {
    if (cart.value.length === 0) {
      throw new Error('Корзина пуста');
    }
    if (!activeShift.value) {
      // Auto start shift if not started
      startShift();
    }
    if (!activeShift.value || !currentEmployee.value) {
      throw new Error('Нет активной смены');
    }

    const saleItems = cart.value.map((ci) => {
      const cat = categories.value.find((c) => c.id === ci.product.categoryId);
      return {
        productId: ci.productId,
        name: ci.product.name,
        categoryName: cat?.name || 'Другое',
        quantity: ci.quantity,
        price: ci.product.price,
        costPrice: ci.product.costPrice,
        subtotal: ci.product.price * ci.quantity,
      };
    });

    const total = cartTotalAmount.value;
    const saleId = generateUUID();
    const nextOrderNum = (activeShift.value.salesCount || 0) + 1;

    const newSale: Sale = {
      id: saleId,
      orderNumber: nextOrderNum,
      shiftId: activeShift.value.id,
      employeeId: currentEmployee.value.id,
      employeeName: currentEmployee.value.name,
      items: saleItems,
      totalAmount: total,
      totalCost: saleItems.reduce((acc, i) => acc + (i.costPrice || 0) * i.quantity, 0),
      paymentMethod: selectedPaymentMethod.value,
      createdAt: new Date().toISOString(),
    };

    activeShift.value.sales.push(newSale);
    activeShift.value.salesCount += 1;
    activeShift.value.totalRevenue += total;
    activeShift.value.paymentBreakdown[selectedPaymentMethod.value] += total;

    lastCompletedSale.value = newSale;
    clearCart();
    saveToStorage();
    return newSale;
  }

  // --- Catalog Export / Import (Encrypted with Password) ---
  function completeInitialSetup(cafeName: string, adminPin: string) {
    settings.value = {
      ...settings.value,
      cafeId: `cafe-${generateUUID().substring(0, 8)}`,
      cafeName,
      adminPin,
    };
    isConfigured.value = true;
    currentMode.value = 'admin';
    saveToStorage();
    showToast('Доступ администратора создан', 'success');
  }

  async function exportEncryptedCatalog(password: string): Promise<{ file: EncryptedCatalogFile; filename: string }> {
    const payload = {
      cafeId: settings.value.cafeId,
      cafeName: settings.value.cafeName,
      version: catalogVersion.value,
      exportedAt: new Date().toISOString(),
      categories: categories.value,
      products: products.value,
      employees: employees.value,
      settings: settings.value,
    };

    const encrypted = await encryptCatalog(payload, password);
    const cleanCafeName = settings.value.cafeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${cleanCafeName}-v${catalogVersion.value}.catalog`;

    return { file: encrypted, filename };
  }

  async function inspectCatalogFile(
    fileData: EncryptedCatalogFile,
    password: string
  ): Promise<{ diff: CatalogDiff; payload: any }> {
    const payload = await decryptCatalog(fileData, password);

    if (
      !payload ||
      !Array.isArray(payload.categories) ||
      !Array.isArray(payload.products) ||
      !Array.isArray(payload.employees) ||
      !payload.settings?.cafeName
    ) {
      throw new Error('Каталог повреждён или создан в несовместимой версии приложения');
    }

    // Calculate diff between local catalog and imported catalog
    const addedProducts: Product[] = [];
    const updatedProducts: { product: Product; oldPrice: number; newPrice: number }[] = [];
    const removedProducts: Product[] = [];

    const existingMap = new Map(products.value.map((p) => [p.id, p]));
    const incomingMap = new Map(payload.products.map((p) => [p.id, p]));

    for (const [id, incProd] of incomingMap.entries()) {
      const existing = existingMap.get(id);
      if (!existing) {
        addedProducts.push(incProd);
      } else if (existing.price !== incProd.price || existing.name !== incProd.name) {
        updatedProducts.push({
          product: incProd,
          oldPrice: existing.price,
          newPrice: incProd.price,
        });
      }
    }

    for (const [id, exProd] of existingMap.entries()) {
      if (!incomingMap.has(id)) {
        removedProducts.push(exProd);
      }
    }

    const diff: CatalogDiff = {
      oldVersion: catalogVersion.value,
      newVersion: payload.version,
      addedProducts,
      updatedProducts,
      removedProducts,
      categoriesCount: payload.categories.length,
    };

    return { diff, payload };
  }

  function applyDecryptedCatalog(payload: any) {
    catalogVersion.value = payload.version;
    categories.value = payload.categories;
    products.value = payload.products;
    employees.value = Array.isArray(payload.employees) ? payload.employees : [];
    if (payload.settings?.cafeName) {
      settings.value.cafeName = payload.settings.cafeName;
    }
    isCatalogImported.value = true;
    saveToStorage();
    showToast(`Каталог v${payload.version} успешно применён!`, 'success');
  }

  // --- Shift Report Export / Import ---
  async function exportShiftReport(shift: Shift): Promise<{ report: ShiftReportFile; filename: string }> {
    const report = await createShiftReport(shift);
    const dateStr = (shift.endTime || shift.startTime).split('T')[0];
    const empName = shift.employeeName.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '_');
    const filename = `shift_${empName}_${dateStr}.report`;
    return { report, filename };
  }

  async function importShiftReport(report: ShiftReportFile): Promise<{ success: boolean; shift: Shift }> {
    // 1. Verify format & tamper-proof cryptographic checksum
    await verifyShiftReport(report);

    const shift = report.data.shift;

    // 2. Strict Protection against duplicate imports!
    if (importedShiftIds.value.includes(shift.id)) {
      throw new Error(
        `⚠️ Эта смена уже была импортирована ранее!\nСотрудник: ${shift.employeeName}\nВыручка: ${shift.totalRevenue} ${settings.value.currency}\nShift ID: ${shift.id}\nПовторный импорт заблокирован.`
      );
    }

    // 3. Register shift
    importedShiftIds.value.push(shift.id);
    historicalShifts.value.unshift(shift);
    saveToStorage();

    showToast(
      `Смена сотрудника ${shift.employeeName} (${shift.totalRevenue} ${settings.value.currency}) успешно импортирована!`,
      'success'
    );
    return { success: true, shift };
  }

  // --- Admin Catalog Editing ---
  function addProduct(product: Omit<Product, 'id'>) {
    const newProd: Product = {
      ...product,
      id: `prod-${generateUUID().substring(0, 8)}`,
    };
    products.value.push(newProd);
    catalogVersion.value += 1;
    saveToStorage();
    showToast(`Товар "${newProd.name}" добавлен. Каталог обновлён до v${catalogVersion.value}`, 'success');
  }

  function updateProduct(updated: Product) {
    const idx = products.value.findIndex((p) => p.id === updated.id);
    if (idx !== -1) {
      products.value[idx] = { ...updated };
      catalogVersion.value += 1;
      saveToStorage();
      showToast(`Товар "${updated.name}" обновлен. Каталог v${catalogVersion.value}`, 'success');
    }
  }

  function deleteProduct(id: string) {
    const idx = products.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const name = products.value[idx].name;
      products.value.splice(idx, 1);
      catalogVersion.value += 1;
      saveToStorage();
      showToast(`Товар "${name}" удален. Каталог v${catalogVersion.value}`, 'info');
    }
  }

  function addCategory(cat: Omit<Category, 'id'>) {
    const newCat: Category = {
      ...cat,
      id: `cat-${generateUUID().substring(0, 8)}`,
    };
    categories.value.push(newCat);
    catalogVersion.value += 1;
    saveToStorage();
  }

  function addEmployee(emp: Omit<Employee, 'id'>) {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${generateUUID().substring(0, 8)}`,
    };
    employees.value.push(newEmp);
    saveToStorage();
    showToast(`Сотрудник "${newEmp.name}" добавлен (PIN: ${newEmp.pin})`, 'success');
  }

  function updateEmployee(updated: Employee) {
    const index = employees.value.findIndex((employee) => employee.id === updated.id);
    if (index === -1) return;

    employees.value[index] = { ...updated };
    if (currentEmployee.value?.id === updated.id) {
      currentEmployee.value = { ...updated };
    }
    saveToStorage();
    showToast(`Данные сотрудника "${updated.name}" обновлены`, 'success');
  }

  function deleteEmployee(employeeId: string): boolean {
    const employee = employees.value.find((item) => item.id === employeeId);
    if (!employee) return false;
    if (activeShift.value?.employeeId === employeeId) {
      showToast('Нельзя удалить сотрудника с открытой сменой', 'error');
      return false;
    }

    employees.value = employees.value.filter((item) => item.id !== employeeId);
    if (currentEmployee.value?.id === employeeId) {
      currentEmployee.value = null;
    }
    saveToStorage();
    showToast(`Сотрудник "${employee.name}" удалён`, 'info');
    return true;
  }

  function resetAllToDemo() {
    localStorage.removeItem(STORAGE_KEY);
    settings.value = { ...INITIAL_SETTINGS };
    settings.value.adminPin = '1234';
    isConfigured.value = true;
    isCatalogImported.value = true;
    catalogVersion.value = 12;
    categories.value = [...INITIAL_CATEGORIES];
    products.value = [...INITIAL_PRODUCTS];
    employees.value = [...INITIAL_EMPLOYEES];
    cart.value = [];
    activeShift.value = null;
    currentEmployee.value = null;
    seedSampleHistoricalShifts();
    saveToStorage();
    showToast('База данных сброшена к исходным демо-данным', 'info');
  }

  return {
    currentMode,
    isConfigured,
    isCatalogImported,
    settings,
    catalogVersion,
    categories,
    products,
    employees,
    currentEmployee,
    activeShift,
    cart,
    selectedPaymentMethod,
    lastCompletedSale,
    historicalShifts,
    importedShiftIds,
    toast,
    // Computeds
    cartTotalAmount,
    cartTotalItemsCount,
    // Methods
    showToast,
    completeInitialSetup,
    loadFromStorage,
    saveToStorage,
    addToCart,
    removeFromCart,
    decreaseQuantity,
    setQuantity,
    clearCart,
    loginEmployee,
    logoutEmployee,
    startShift,
    closeShift,
    processSale,
    exportEncryptedCatalog,
    inspectCatalogFile,
    applyDecryptedCatalog,
    exportShiftReport,
    importShiftReport,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    resetAllToDemo,
  };
});

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}
