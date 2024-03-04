import { Frog, Button } from "frog";
import { KriptonioSdk } from "@kriptonio/sdk";
import { handle } from "frog/vercel";
const smartContractId = process.env.SMART_CONTRACT_ID!;

const accessToken = process.env.ACCESS_TOKEN!;

export const app = new Frog({
  basePath: "/api",
});
const sdk = new KriptonioSdk({ accessToken });

const wallet = await sdk.wallet.generate({
  chainId: 80001,
});

const smartContract = await sdk.smartContract.get({
  id: smartContractId,
  wallet,
});

if (!(await smartContract.deployed())) {
  await smartContract.deploy({
    params: [wallet.address],
  });
}

app.frame("/", async (c) => {
  let alreadyMinted = false;
  let imageUrl: string = "https://raw.seadn.io/files/e18bcb2c05ee14564b06acd41f81d0dc.svg";
  let account: Account | null = null;
  const isMint = c.buttonValue === "mint";
  const isView = c.buttonValue === "view";

  if (c.frameData && isMint) {
    account = await fetch(`https://fnames.farcaster.xyz/transfers?fid=${c.frameData.fid}`)
      .then((r) => r.json())
      .then((r) => r.transfers[0]);

    const tokenId = account?.id;
    const balance = await smartContract.read<bigint>("balanceOf", {
      params: [account?.owner],
    });
    alreadyMinted = balance > 0;

    if (!alreadyMinted) {
      smartContract
        .write("safeMint", {
          params: [account?.owner, tokenId],
        })
        .then((tx) => console.log("minted", tx))
        .catch((e) => console.error("minting error", e.message));
    }
  }
  if (c.frameData && isView) {
    account = await fetch(`https://fnames.farcaster.xyz/transfers?fid=${c.frameData.fid}`)
      .then((r) => r.json())
      .then((r) => r.transfers[0]);

    // const tokenId = c.frameData.timestamp;
    const tokenId = account?.id;

    // svg = await smartContract.read("svg", {
    //   params: [tokenId],
    // });
    // OpenSea API Endpoint for fetching NFT metadata for a single NFT: https://docs.opensea.io/reference/get_nft
    const apiUrl =
      "https://testnets-api.opensea.io/api/v2/chain/mumbai/contract/" + "0xFcb8a065fC45F8876feda44c28c5023903a242B6" + "/nfts/" + tokenId;

    // Make a fetch request to the API with headers
    fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        // Add any other headers required by your API
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.nft && data.nft.image_url) {
          imageUrl = data.nft.image_url;
          console.log(imageUrl);
        } else {
          console.log("error");
        }
      });
  }

  return c.res({
    image: (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(to right, #432889, #17101F)",
        }}
      >
        {alreadyMinted ? (
          <span style={{ color: "white", fontSize: "50px" }}>NFT Already Minted</span>
        ) : alreadyMinted && isMint ? (
          <span style={{ color: "white", fontSize: "50px" }}> NFT Minted to ${account?.username} 🏆</span>
        ) : alreadyMinted && isView ? (
          <img src={imageUrl} />
        ) : (
          <span style={{ color: "white", fontSize: "50px" }}> Click Mint to mint a free NFT 🖼</span>
        )}
      </div>
    ),
    intents: alreadyMinted
      ? [<Button value="view">View Your NFT</Button>]
      : isView
      ? [
          <Button.Redirect location={`https://testnets.opensea.io/0xFcb8a065fC45F8876feda44c28c5023903a242B6/${account?.id}`}>
            OpenSea
          </Button.Redirect>,
        ]
      : [<Button value="mint">Mint</Button>],
  });
});

type Account = {
  id: number;
  owner: string;
  username: string;
};

export const GET = handle(app);
export const POST = handle(app);
