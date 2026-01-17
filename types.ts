
export interface Motorbike {
  id: string;
  name: string;
  price: number;
  category: string;
  km: number;
  year: number;
  image: string; // Base64 compressed string
  cc: number;     // Cilindrada
  description: string; // Estado da moto
}

export type Category = 'Todos' | 'Esportiva' | 'Naked' | 'Trail' | 'Custom' | 'Scooter';
