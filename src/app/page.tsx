// import { redirect } from 'next/navigation';
// export default function Home() { redirect('/dashboard'); }

export { default } from './dashboard/page';


// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   devIndicators: false,
//   cacheComponents: true,
//   partialPrefetching: true,
//   async redirects() {
//     return [{ source: "/", destination: "/dashboard", permanent: false }];
//   },
// };

// export default nextConfig;