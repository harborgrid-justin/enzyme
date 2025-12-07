import { Feature } from '@missionfabric-js/enzyme';

export interface DashboardState {
  metrics: {
    users: number;
    revenue: number;
    orders: number;
  };
  loading: boolean;
}

export const DashboardFeature: Feature = {
  name: 'dashboard',
  routes: [
    {
      path: '/dashboard',
      component: () => import('./Dashboard'),
      meta: {
        requiresAuth: true,
        title: 'Dashboard'
      }
    },
    {
      path: '/dashboard/settings',
      component: () => import('./Settings'),
      meta: {
        requiresAuth: true,
        title: 'Dashboard Settings'
      }
    }
  ],
  store: {
    state: {
      metrics: {
        users: 0,
        revenue: 0,
        orders: 0
      },
      loading: false
    },
    actions: {
      fetchMetrics: async () => {
        // Fetch dashboard metrics
      }
    }
  }
};

export default DashboardFeature;
