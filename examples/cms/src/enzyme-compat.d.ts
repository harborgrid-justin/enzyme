declare module '@missionfabric-js/enzyme' {
  export namespace queries {
    const queryClient: import('@tanstack/react-query').QueryClient;
    function createQueryClient(): import('@tanstack/react-query').QueryClient;
    const QueryClient: typeof import('@tanstack/react-query').QueryClient;
  }
}
