import { useState, useEffect } from "react";
import { useWallet } from "./useWallet";
import { useChainSelector } from "./useChainSelector";
import { useAppSupplies } from "./useAppSupplies";
import { useAppToast } from "./useAppToast";
import { useEthersSigner } from "./useEthersSigner";
import { Contract } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ChainScanner } from "ChainScanner";
import { CoinGeckoApi } from "CoinGeckoApi";

export const useBurnPageFunctionalities = () => {



 

enum BurnTxProgress {
  default = "Burn App Tokens",
  burning = "Burning...",
}
  const {
    walletAddress,
    isWalletConnected,
    walletBalance,
    isBalanceError,
    openChainModal,
    walletChain,
    chains:receiveChains ,
    openConnectModal,
  } = useWallet();
  //    const [approveTxHash, setApproveTxHash] = useState<string | null>(null);//wasnt being used
  const { openChainSelector, setOpenChainSelector, openChainSelectorModal } =
    useChainSelector();
  const {
    supplies,
    allSupplies,
    setSuppliesChain,
    suppliesChain,
    fetchSupplies,
  } = useAppSupplies(true);
  const { toastMsg, toastSev, showToast } = useAppToast();
  const ethersSigner = useEthersSigner({
    chainId: walletChain?.id ?? chainEnum.mainnet,
  });
  const [burnTransactions, setBurnTransactions] = useState<any[]>([]);
  const [burnAmount, setBurnAmount] = useState("");
  const [txButton, setTxButton] = useState<BurnTxProgress>(
    BurnTxProgress.default
  );
  const [txProgress, setTxProgress] = useState<boolean>(false);
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [coinData, setCoinData] = useState<any>({});
  const [isOldToken, setIsOldToken] = useState(false);

  const statsSupplies = supplies;
  const tokenAddress = fetchAddressForChain(
    suppliesChain?.id,
    isOldToken ? "oldToken" : "newToken"
  );

  useEffect(() => {
    CoinGeckoApi.fetchCoinData()
      .then((data: any) => {
        setCoinData(data?.market_data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    if (!walletChain) return;
    //console.log(suppliesChain);
    let isSubscribed = true;
    // const newTokenAddress = fetchAddressForChain(
    //   walletChain?.id,
    //   isOldToken ? "oldToken" : "newToken"
    // );
    if (isSubscribed) setBurnTransactions([]);
    const isTestnet = isChainTestnet(walletChain?.id);
    let _chainObjects: any[] = [mainnet, avalanche, fantom];
    if (isTestnet) _chainObjects = [sepolia, avalancheFuji, fantomTestnet];
    Promise.all(ChainScanner.fetchAllTxPromises(isTestnet))
      .then((results: any) => {
        //console.log(results, isTestnet);
        if (isSubscribed) {
          let new_chain_results: any[] = [];
          results.forEach((results_a: any[], index: number) => {
            new_chain_results.push(
              results_a.map((tx: any) => ({
                ...tx,
                chain: _chainObjects[index],
              }))
            );
          });
          let res = new_chain_results.flat();
          console.log(res, isTestnet);
          res = ChainScanner.sortOnlyBurnTransactions(res);
          res = res.sort((a: any, b: any) => b.timeStamp - a.timeStamp);
          setBurnTransactions(res);
        }
      })
      .catch((err) => {
        console.log(err);
      });
    return () => {
      isSubscribed = false;
    };
  }, [walletChain, isOldToken]);

  const onChangeBurnAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value == "") setBurnAmount("");
    if (isNaN(parseFloat(e.target.value))) return;
    setBurnAmount(e.target.value);
  };

  const refetchTransactions = () => {
    Promise.all(
      ChainScanner.fetchAllTxPromises(isChainTestnet(walletChain?.id))
    )
      .then((results: any) => {
        //console.log(res);
        let res = results.flat();
        res = ChainScanner.sortOnlyBurnTransactions(res);
        res = res.sort((a: any, b: any) => b.timeStamp - a.timeStamp);
        setBurnTransactions(res);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const executeBurn = async () => {
    if (!isWalletConnected) {
      openConnectModal();
    }
    if (burnAmount === "") {
      console.log("Enter amount to migrate");
      showToast("Enter amount to migrate", ToastSeverity.warning);
      return;
    }
    const newTokenAddress = fetchAddressForChain(walletChain?.id, "newToken");
    const oftTokenContract = new Contract(
      newTokenAddress,
      oftAbi,
      ethersSigner
    );
    let amount = parseEther(burnAmount);
    setTxButton(BurnTxProgress.burning);
    setTxProgress(true);
    try {
      const burnTx = await oftTokenContract.burn(
        //tokenAddress,
        amount
      );
      setBurnTxHash(burnTx.hash);
      await burnTx.wait();
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      refetchTransactions();
      fetchSupplies();
    } catch (err) {
      console.log(err);
      setTxButton(BurnTxProgress.default);
      setTxProgress(false);
      showToast("Burn Failed!", ToastSeverity.error);
      return;
    }
  };

  return {
    openConnectModal,
    openChainSelector,
    openChainSelectorModal,
    setOpenChainSelector,
    suppliesChain,
    supplies,
    statsSupplies,
    setSuppliesChain,
    walletChain,
    tokenAddress,
    fetchSupplies,
    receiveChains,
    toastMsg,
    openChainModal,
    toastSev,
    showToast,
    ethersSigner,
    burnTransactions,
    burnAmount,
    setBurnAmount,
    txButton,
    setTxButton,
    txProgress,
    setTxProgress,
    burnTxHash,
    setBurnTxHash,
    coinData,
    onChangeBurnAmount,
    refetchTransactions,
    executeBurn,
  };
};
