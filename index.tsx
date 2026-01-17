
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { Motorbike } from './types';

// --- Configuração Firebase Oficial ---
const firebaseConfig = {
  apiKey: "AIzaSyCjmIDagLvCIPB75gTJx2wGvSctyi-ULTY",
  authDomain: "rota-certa-motos.firebaseapp.com",
  databaseURL: "https://rota-certa-motos-default-rtdb.firebaseio.com/",
  projectId: "rota-certa-motos",
  storageBucket: "rota-certa-motos.firebasestorage.app",
  messagingSenderId: "653591842551",
  appId: "1:653591842551:web:12b130f23cc6564b200df2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const inventoryRef = ref(db, 'inventory');

// --- Estado Global ---
let inventory: Motorbike[] = [];
let isAdmin: boolean = sessionStorage.getItem('isAdmin') === 'true'; 
let logoClickCount: number = 0;
let logoClickTimer: any = null;
let currentImageData: string = '';
let editingId: string | null = null;

const dom = {
  motoGrid: document.getElementById('moto-grid')!,
  logoTrigger: document.getElementById('logo-trigger')!,
  adminLoginModal: document.getElementById('admin-login-modal')!,
  confirmAdminBtn: document.getElementById('confirm-admin-btn')!,
  adminPasswordInput: document.getElementById('admin-password')! as HTMLInputElement,
  adminFab: document.getElementById('admin-fab')!,
  adminAddModal: document.getElementById('admin-add-modal')!,
  addMotoForm: document.getElementById('add-moto-form')! as HTMLFormElement,
  interestModal: document.getElementById('interest-modal')!,
  interestOverlay: document.getElementById('interest-modal-overlay')!,
  interestContent: document.getElementById('interest-modal-content')!,
  imageFileInput: document.getElementById('add-image-file')! as HTMLInputElement,
  imagePreviewLabel: document.getElementById('image-preview-label')!,
};

// --- Funções Auxiliares ---

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
}

// --- Funções de Interface ---

(window as any).editMoto = function(id: string) {
  const moto = inventory.find(m => m.id === id);
  if (!moto) return;
  
  editingId = id;
  currentImageData = moto.image;
  
  const modalTitle = document.getElementById('modal-title');
  if (modalTitle) modalTitle.innerText = "EDITAR MOTO";

  (document.getElementById('add-name') as HTMLInputElement).value = moto.name;
  (document.getElementById('add-price') as HTMLInputElement).value = moto.price.toString();
  (document.getElementById('add-category') as HTMLSelectElement).value = moto.category;
  (document.getElementById('add-km') as HTMLInputElement).value = moto.km.toString();
  (document.getElementById('add-year') as HTMLInputElement).value = moto.year.toString();
  (document.getElementById('add-cc') as HTMLInputElement).value = moto.cc.toString();
  (document.getElementById('add-description') as HTMLTextAreaElement).value = moto.description;
  
  dom.imagePreviewLabel.innerHTML = `<img src="${moto.image}" class="w-full h-full object-cover">`;
  dom.adminAddModal.classList.remove('hidden');
};

(window as any).closeInterestModal = () => {
  dom.interestOverlay.classList.add('hidden');
  dom.interestModal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
};

(window as any).openInterestModal = (id: string) => {
  const moto = inventory.find(m => m.id === id);
  if (!moto) return;
  
  dom.interestOverlay.classList.remove('hidden');
  dom.interestModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  dom.interestContent.innerHTML = `
    <div class="flex justify-between items-start mb-5">
      <div>
        <h2 class="text-2xl font-black italic uppercase tracking-tighter text-white">${moto.name}</h2>
        <p class="text-red-600 font-black text-[9px] uppercase tracking-[0.2em] mt-1">!!SUA MOTO NOSSA META!!</p>
      </div>
      <button onclick="window.closeInterestModal()" class="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-500"><i class="fa-solid fa-xmark"></i></button>
    </div>
    
    <div class="grid grid-cols-2 gap-2 mb-5">
      <div class="bg-white/5 p-4 rounded-xl border border-white/5">
        <span class="block text-[8px] text-slate-500 font-black uppercase mb-0.5">KM Atual</span>
        <span class="text-base font-black italic text-white">${moto.km.toLocaleString()}</span>
      </div>
      <div class="bg-white/5 p-4 rounded-xl border border-white/5">
        <span class="block text-[8px] text-slate-500 font-black uppercase mb-0.5">Ano Fabricação</span>
        <span class="text-base font-black italic text-white">${moto.year}</span>
      </div>
      <div class="bg-white/5 p-4 rounded-xl border border-white/5">
        <span class="block text-[8px] text-slate-500 font-black uppercase mb-0.5">Cilindrada</span>
        <span class="text-base font-black italic text-white">${moto.cc} CC</span>
      </div>
      <div class="bg-white/5 p-4 rounded-xl border border-white/5">
        <span class="block text-[8px] text-slate-500 font-black uppercase mb-0.5">Tipo</span>
        <span class="text-base font-black italic text-white uppercase">${moto.category}</span>
      </div>
    </div>
    
    <div class="bg-white/5 p-5 rounded-2xl border border-white/5 mb-6">
      <h4 class="text-[8px] text-red-600 font-black uppercase tracking-widest mb-2">Ficha Técnica / Observações</h4>
      <p class="text-[12px] text-slate-400 font-medium leading-relaxed">${moto.description.replace(/\n/g, '<br>')}</p>
    </div>
    
    <div class="flex flex-col space-y-3">
      <div class="flex items-center justify-between px-1">
        <span class="text-[9px] text-slate-500 font-black uppercase tracking-widest">Investimento</span>
        <span class="text-2xl font-black italic text-white">R$ ${moto.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
      </div>
      <button onclick="window.sendWhatsApp('${moto.id}')" class="w-full py-5 bg-red-600 rounded-2xl text-white font-black text-base flex items-center justify-center space-x-3 active:scale-95 transition-transform">
        <i class="fa-brands fa-whatsapp text-2xl"></i>
        <span>NEGOCIAR NO WHATSAPP</span>
      </button>
    </div>
  `;
};

(window as any).sendWhatsApp = (id: string) => {
  const moto = inventory.find(m => m.id === id);
  if (!moto) return;
  const msg = encodeURIComponent(`Olá! Vi a moto ${moto.name} no seu catálogo e gostaria de negociar.`);
  window.open(`https://wa.me/5515997321027?text=${msg}`, '_blank');
};

// --- Ciclo de Vida e Firebase ---

function init() {
  // COMANDO DE LIMPEZA TEMPORÁRIO: Executa uma vez e limpa o nó 'inventory'
  // Remova a linha abaixo após o primeiro carregamento do site para começar a salvar dados reais.
  remove(inventoryRef);

  if (isAdmin) {
    document.body.classList.add('admin-mode');
  } else {
    document.body.classList.remove('admin-mode');
  }
  
  onValue(inventoryRef, (snapshot) => {
    inventory = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      const id = childSnapshot.key as string;
      inventory.push({
        ...data,
        id: id
      });
    });
    renderInventory();
  });

  setupEventListeners();
}

function setupEventListeners() {
  dom.logoTrigger.addEventListener('click', () => {
    logoClickCount++;
    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 1000);
    if (logoClickCount === 3) {
      dom.adminLoginModal.classList.remove('hidden');
      dom.adminPasswordInput.focus();
      logoClickCount = 0;
    }
  });
  
  dom.confirmAdminBtn.addEventListener('click', handleAdminLogin);
  dom.adminPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdminLogin(); });
  
  dom.adminFab.addEventListener('click', () => {
    editingId = null;
    currentImageData = '';
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.innerText = "CADASTRAR MOTO";
    dom.addMotoForm.reset();
    dom.imagePreviewLabel.innerHTML = `<i class="fa-solid fa-camera text-xl text-slate-500 mb-1"></i><span class="text-[8px] font-black uppercase text-slate-500">Adicionar Foto</span>`;
    dom.adminAddModal.classList.remove('hidden');
  });
  
  dom.imageFileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      compressImage(file).then(base64 => {
        currentImageData = base64;
        dom.imagePreviewLabel.innerHTML = `<img src="${base64}" class="w-full h-full object-cover">`;
      });
    }
  });
  
  dom.addMotoForm.addEventListener('submit', handleFormSubmit);
  dom.interestOverlay.addEventListener('click', (window as any).closeInterestModal);
}

function handleAdminLogin() {
  if (dom.adminPasswordInput.value === '1027') {
    isAdmin = true;
    sessionStorage.setItem('isAdmin', 'true');
    document.body.classList.add('admin-mode');
    dom.adminLoginModal.classList.add('hidden');
    dom.adminPasswordInput.value = '';
    renderInventory();
    alert('Modo Proprietário Ativado!');
  } else {
    alert('Senha incorreta!');
    dom.adminPasswordInput.value = '';
  }
}

async function handleFormSubmit(e: Event) {
  e.preventDefault();
  if (!currentImageData) {
    alert('Por favor, adicione uma foto.');
    return;
  }
  
  const motoData = {
    name: (document.getElementById('add-name') as HTMLInputElement).value,
    price: Number((document.getElementById('add-price') as HTMLInputElement).value),
    category: (document.getElementById('add-category') as HTMLSelectElement).value,
    km: Number((document.getElementById('add-km') as HTMLInputElement).value),
    year: Number((document.getElementById('add-year') as HTMLInputElement).value),
    cc: Number((document.getElementById('add-cc') as HTMLInputElement).value),
    description: (document.getElementById('add-description') as HTMLTextAreaElement).value,
    image: currentImageData,
  };

  try {
    if (editingId) {
      const motoRef = ref(db, `inventory/${editingId}`);
      await update(motoRef, motoData);
      alert('Editado com sucesso!');
    } else {
      const newMotoRef = push(inventoryRef);
      await set(newMotoRef, motoData);
      alert('Cadastrado com sucesso!');
    }
    dom.adminAddModal.classList.add('hidden');
  } catch (err: any) {
    console.error("Erro Firebase:", err);
    alert('Erro ao salvar: ' + err.message);
  }
}

// --- Renderização do Grid ---

function renderInventory() {
  if (inventory.length === 0) {
    dom.motoGrid.innerHTML = `
      <div class="py-20 text-center text-slate-700 font-bold uppercase text-[10px] tracking-widest">
        Nenhuma moto no estoque no momento.
      </div>
    `;
    return;
  }

  dom.motoGrid.innerHTML = inventory.map(moto => `
    <div class="moto-card rounded-[24px] overflow-hidden relative shadow-lg">
      <div class="relative h-[180px] w-full overflow-hidden cursor-pointer" onclick="window.openInterestModal('${moto.id}')">
        <img src="${moto.image}" alt="${moto.name}" class="w-full h-full object-cover">
        <div class="absolute top-2.5 right-2.5 bg-red-600 text-white text-[8px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase">
          Ano ${moto.year}
        </div>
      </div>
      
      <div class="p-4">
        <div class="flex justify-between items-start mb-1.5">
          <h3 class="text-base font-black italic text-white uppercase tracking-tighter leading-none">${moto.name}</h3>
          <span class="text-[7px] text-red-600 font-black uppercase border border-red-600/20 px-1 py-0.5 rounded bg-red-600/5">${moto.category}</span>
        </div>
        
        <div class="flex items-center space-x-3 text-[8px] text-slate-400 font-black uppercase tracking-widest mb-3">
          <span class="flex items-center"><i class="fa-solid fa-gauge-high text-red-600 mr-1"></i>${moto.km.toLocaleString()} KM</span>
          <span class="flex items-center"><i class="fa-solid fa-bolt text-red-600 mr-1"></i>${moto.cc} CC</span>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-white/5">
          <span class="text-xl font-black text-white italic">R$ ${moto.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          
          <div class="flex space-x-1.5">
            <button onclick="window.editMoto('${moto.id}')" class="admin-only w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-blue-500 border border-white/5 active:scale-90 transition-transform">
              <i class="fa-solid fa-pencil text-[12px]"></i>
            </button>
            
            <button onclick="window.openInterestModal('${moto.id}')" class="h-9 px-4 bg-white text-black rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-transform">
              DETALHES
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

init();
