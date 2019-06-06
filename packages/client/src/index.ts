import { keccak256 } from 'js-sha3';
import DeveloperGateway from '@oasis/developer-gateway';
import { cbor, bytes } from '@oasis/common';
import {
  Service,
  deploy,
  OasisCoder,
  DeployHeaderReader,
  DeployHeaderWriter,
  setDefaultOasisGateway
} from '@oasis/service';
import { Deoxysii, encrypt, decrypt } from '@oasis/confidential';
import {
  EthereumGateway,
  EthereumCoder,
  EthereumWallet as Wallet
} from '@oasis/ethereum';

setDefaultOasisGateway(DeveloperGateway.http('http://localhost:1234'));

let oasis = {
  Service,
  Wallet,
  deploy,
  utils: {
    cbor,
    bytes,
    keccak256,
    encrypt,
    decrypt,
    OasisCoder,
    EthereumCoder,
    EthereumGateway,
    Deoxysii,
    DeployHeaderReader,
    DeployHeaderWriter
  }
};

export default oasis;