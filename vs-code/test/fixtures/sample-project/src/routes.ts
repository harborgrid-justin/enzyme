import { RouteConfig } from '@missionfabric-js/enzyme';

export const routes: RouteConfig[] = [
  {
    path: '/',
    component: () => import('./pages/Home'),
    meta: {
      title: 'Home'
    }
  },
  {
    path: '/about',
    component: () => import('./pages/About'),
    meta: {
      title: 'About'
    }
  },
  {
    path: '/users',
    component: () => import('./pages/Users'),
    meta: {
      requiresAuth: true,
      title: 'Users'
    },
    children: [
      {
        path: ':id',
        component: () => import('./pages/UserDetail'),
        meta: {
          title: 'User Detail'
        }
      }
    ]
  },
  {
    path: '/dashboard',
    component: () => import('./features/dashboard'),
    meta: {
      requiresAuth: true,
      title: 'Dashboard'
    }
  },
  {
    path: '/admin',
    component: () => import('./pages/Admin'),
    meta: {
      requiresAuth: true,
      requiresRole: 'admin',
      title: 'Admin Panel'
    }
  },
  {
    path: '/404',
    component: () => import('./pages/NotFound'),
    meta: {
      title: 'Page Not Found'
    }
  },
  {
    path: '*',
    redirect: '/404'
  }
];

export default routes;
