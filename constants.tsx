
import { UserRole, User, ReadingDay, Post } from './types';

export const IMAGES = {
  ADMIN_AVATAR: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2qfwQSIvKScR05QJa66Kfvt_T6tYjZC6g0U6kJ0sGu-LBLJDIXJ2zH9QpdlUPgldYgUAclqWRP4MdIvcEs_dHWlK6Rk3LFPm03ViFX_cJS9bFncH3GJ41uVNI-ZygalIL3Lp1TMDrrTxS48g_BP0H-KP09y-O1ND_mWhg0Zd8RNFvjt168nc1uEfcWSe1ToNBAbMebNAkTUwjONeLKSOijY1dpvNOt0qDclEIvvXw1xWh7BcHgt9jR09AxFo7_gatVknTGJuLi6oB",
  USER_AVATAR: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3zA7RQeMQgmwycYTkN1Vqyi9cSCIQ0AXgGomL_ameHKQfU20sqdSBSHHdpzHXLI7i2t_z4moW4Bub1DZi955bgFSquvffjZACfLIMyIrYcaFU2AokqUzBt_j92jiGUpyOvxYT2jENL6ipHiPjRP9X_8h8j-IOhGkQdvTXAgo71OqS4mdqa8lnmfX_iooMCyMpcflGTN9mQpCg0J0wdOS1fdQHge6C2noQpGNrE8EUMjv7TXTf92By2hdIGy4AdDCdhYQ6s7EVT4Y2",
  FRIEND_1: "https://lh3.googleusercontent.com/aida-public/AB6AXuDtsoeR29z0ETq-YZcvf0LkComd_SuAkpkwTKah3S68nj3r6_fvc4ZmbFHCNufwFXR5hfUkpCMXcdNU8es5v_q8xO0wegj6TdzUvIlfsB4cuTJsUU6X4tBlaQr5sWb9HCztuOiqJwhrtdowpeLjPFv9UkN5s6XJnKY-PL09C4ZJKopbtfDL5xd8AaHkM9vvsx4TeePCaYAWSwR_zX3ycUyHaGVX4QRaO3LBj44lpwchLeJd8UzAYpKp58qZ_NFI3O1zYuOqtfZTqIat",
  FRIEND_2: "https://lh3.googleusercontent.com/aida-public/AB6AXuCST49ja9Eys5xHcOWImao1-EzMaInafCJ5UZeC6TSkkhH3_reHZB3rGx4tyDr5nhucrTCUJviuiyaWJXMyYfw3m52II5Q8aNm_XVs6V_sTIXbp2-EsfQkgmX0EwDvVGOHKWEA6CBvgfoscP4JFfGfel_xsykkNpSJo4LXPzOmLkvJLWhXaq4WQbohBoMezvAlUekXuOs-tdblEPiKvvqLZe45urkjC6Ze0TYpYRha2Vz6a3-lXZFAfJekSR3GJD7sE29ccAVEbEl_p",
  FRIEND_3: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBGYJMfz9YWc6OH8CRSsYhSFiGQncZIObWv3b15AEs1DMa_V8F8CsDlBKuJUJqnoJDZ4o2QNcD63Ysix0CP-6WD6qrHIX3udDWHya--mDcExlW7fefOVG1IWyoPiISiD0omM4ShyMz0VxygTvrV9CiQm2SkA49NU1PnMWjMd_f6eEvSkNfWSgJLXnGXuhRuMduqRmkMaF77RzTRsesrnrQ3kPQ92OE0v9di2oQYwSef_Dd1xQoQ0yZvAkqlo57bFHKUIlisTEz6KjP",
  MAP: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDnrRnC86MH46gj6--iahKUGJgJ015A-HGXfRDVdelch6jjgLpNGGXQs0pb0RlbGEU0WqNlIrPbwuIr-ulhCiz4r8baUYXXxU1lWh89Zu_iXm6BdtsePLItXEqoTfULep5iYRObeJ212QtMiYHaqK0gLqW_oi_WDLnkI93yanCai07OtyNH3Gm5NU8wwVY4KKA0gP7-L3k3Y8kXIQc-kENdb6qYikerHWEhYz-CUfyiIIvXWJa83DLkfhO2EVv-1FgubUaWME2yKkK"
};

export const MOCK_USER: User = {
  id: 'u1',
  name: 'João Davi',
  email: 'joao.davi@exemplo.com',
  avatar: IMAGES.USER_AVATAR,
  role: UserRole.USER,
  streak: 12,
  progress: 76,
  lastReading: 'Salmos 119:1-88'
};

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    user: { name: 'Ana Clara', avatar: IMAGES.FRIEND_1 },
    timestamp: '2 horas atrás',
    category: 'Reflexão',
    content: 'A coragem de Abraão em deixar tudo para trás é algo que me impacta muito. Quantas vezes temos medo de dar o primeiro passo na direção que Deus nos chama?',
    likes: 24,
    comments: 5
  },
  {
    id: 'p2',
    user: { name: 'Beatriz Lima', avatar: IMAGES.FRIEND_2 },
    timestamp: '5 horas atrás',
    category: 'Dúvida',
    content: 'Alguém poderia me explicar melhor o contexto histórico da torre de Babel no capítulo 11? Fiquei com algumas dúvidas sobre a localização geográfica.',
    likes: 8,
    comments: 12,
    image: IMAGES.MAP
  }
];
