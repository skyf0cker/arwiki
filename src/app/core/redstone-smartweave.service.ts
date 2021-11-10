import { Injectable } from '@angular/core';
import { ArweaveService } from './arweave.service';
import { 
	SmartWeaveWebFactory, SmartWeave, 
	EvalStateResult, ArWallet, 
	Tags, ArTransfer } from 'redstone-smartweave';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RedstoneSmartweaveService {
	private _smartweave?: SmartWeave;

  constructor(private _arweave: ArweaveService) {
  	this._smartweave = SmartWeaveWebFactory.memCached(_arweave.arweave);
  }

  getSmartweave(): SmartWeave {
  	return this._smartweave!;
  }

  readState(contractAddress: string): Observable<EvalStateResult<any>> {
  	const contract = this._smartweave!.contract(contractAddress);
  	return from(contract.readState());
  }

  writeInteraction(
  	contractAddress: string,
  	jwk: ArWallet,
  	input: any,
  	tags?: Tags,
  	transfer?: ArTransfer) {
  	const contract = this._smartweave!
	    .contract(contractAddress)
	    .connect(jwk)
	    .setEvaluationOptions({
	      // with this flag set to true, the write will wait for the transaction to be confirmed
	      waitForConfirmation: false,
	    });
	  return from(contract.writeInteraction(input, tags, transfer));
  }

}
