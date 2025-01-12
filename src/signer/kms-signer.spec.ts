import { KmsSigner } from "./kms-signer";
import AWS from "aws-sdk";
import { mocked } from "ts-jest/utils";

import { Signature } from "../signature";
import { parseSignature } from "../asn1-parser";
import { Address } from "../address";

jest.mock("aws-sdk");
jest.mock("../signature");

function makeKMSMock(publicKey: Buffer, signature: Buffer): AWS.KMS {
  const KMS = {
    getPublicKey() {
      return {
        promise() {
          return Promise.resolve({ PublicKey: publicKey });
        },
      };
    },
    sign() {
      return {
        promise() {
          return Promise.resolve({ Signature: signature });
        },
      };
    },
  };

  return KMS as AWS.KMS;
}

describe("KmsSigner", () => {
  let signer: KmsSigner;
  const publicKey = Buffer.from(
    "3056301006072a8648ce3d020106052b8104000a034200044badcc1608925c1d944e50ac6c9dbf0c5fb6b04b8548394a14cc7b5ab6667fde96dda298cf815e1f75d72f52704c3fdf333c84263b744d0e974f24d293bd303b",
    "hex"
  );
  const signature = Buffer.from(
    "304502201fa98c7c5f1b964a6b438d9283adf30519aaea2d1a2b25ac473ac0f85d6e08c0022100e26f7c547cf497959af070ec7c43ebdbb3e4341395912d6ccc950b43e886781b",
    "hex"
  );
  describe("getPublicKey", () => {
    describe("correct", () => {
      beforeEach(async () => {
        mocked(AWS.KMS).mockReturnValue(
          makeKMSMock(publicKey, Buffer.alloc(0))
        );

        signer = new KmsSigner("region", "keyId");
      });

      it("should be return address", async () => {
        const address = await signer.getAddress();

        const expected = Buffer.from(
          "5de3b70a775a81943a65d9fd2aaa58bd1c141233",
          "hex"
        );
        expect(address["buffer"]).toEqual(expected);
      });
    });

    describe("when return non buffer type", () => {
      beforeEach(() => {
        mocked(AWS.KMS).mockReturnValue(
          makeKMSMock(null as any, Buffer.alloc(0))
        );

        signer = new KmsSigner("region", "keyId");
      });
      it("can be throw error", async () => {
        await expect(signer.getAddress()).rejects.toThrow(
          /PublicKey is not Buffer/
        );
      });
    });
  });

  describe("sign", () => {
    type Sign = (
      params: AWS.KMS.Types.SignRequest,
      callback?: (err: AWS.AWSError, data: AWS.KMS.Types.SignResponse) => void
    ) => AWS.Request<AWS.KMS.Types.SignResponse, AWS.AWSError>;
    describe("correct", () => {
      beforeEach(() => {
        mocked(AWS.KMS).mockReturnValue(makeKMSMock(publicKey, signature));

        const { r, s } = parseSignature(signature);
        mocked(Signature).fromDigest.mockReturnValue({
          r,
          s,
          recovery: 27,
        } as any);

        signer = new KmsSigner("region", "keyId");
      });
      it("should be return signature", async () => {
        const digest = Buffer.from("");

        const signature = await signer.sign(digest);

        expect(signature.r.toString("hex")).toBe(
          "1fa98c7c5f1b964a6b438d9283adf30519aaea2d1a2b25ac473ac0f85d6e08c0"
        );

        expect(signature.s.toString("hex")).toBe(
          "e26f7c547cf497959af070ec7c43ebdbb3e4341395912d6ccc950b43e886781b"
        );
      });
    });
    describe("when return non buffer type", () => {
      beforeEach(() => {
        mocked(AWS.KMS).mockReturnValue(makeKMSMock(null as any, null as any));

        signer = new KmsSigner("region", "keyId");
      });
      it("can be throw error", async () => {
        const digest = Buffer.from("");
        await expect(signer.sign(digest)).rejects.toThrow(
          /Signature is not Buffer/
        );
      });
    });
  });
});
