import type { NextPage } from 'next';
import Head from 'next/head';
import { WalletConnect } from '../components/WalletConnect';
import { SwapInterface } from '../components/SwapInterface';

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <Head>
        <title>DEX Aggregator</title>
        <meta name="description" content="Simple DEX Aggregator UI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">D</div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">DEX Aggregator</h1>
          </div>
          <WalletConnect />
        </header>

        <main className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md">
            {/* <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-center mb-8">
              Swap seamlessly.
            </h2> */}
            <SwapInterface />
          </div>
        </main>

        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>Running on Ethereum Sepolia Testnet</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
