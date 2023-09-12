import BN from 'bn.js';
import { utils, transactions as transaction } from 'near-api-js';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

import { ModalSignWrapper } from './Sign.styles';
import ArrowDownSvg from '../../Images/arrow-down';
import ArrowUpSvg from '../../Images/arrow-up';
import InternetSvg from '../../Images/Internet';
import RefLogoSvg from '../../Images/ref-logo';
import { Button } from '../../lib/Button';
import {
  fetchGeckoPrices,
  fetchRefFinancePrices,
} from './Values/fiatValueManager';
import fiatValuesStore from './Values/store';
import { formatNearAmount } from './Values/formatNearAmount';
import { useAuthState } from '../../lib/useAuthState';
import TableContent from '../TableContent/TableContent';
import { encodeSignedDelegate } from '@near-js/transactions';

const deserializeTransactionsFromString = (transactionsString: string) => transactionsString
  .split(',')
  .map((str) => Buffer.from(str, 'base64'))
  .map((buffer) => utils.serialize.deserialize(
    transaction.SCHEMA,
    transaction.Transaction,
    buffer
  ));

interface TransactionDetails {
  signerId: string;
  receiverId: string;
  totalAmount: string;
  fees: {
    transactionFees: string;
    gasLimit: string;
    gasPrice: string;
  };
  transactions: transaction.Transaction[];
  actions: transaction.Action[];
}

export const calculateGasLimit = (actions) => actions
  .filter((a) => Object.keys(a)[0] === 'functionCall')
  .map((a) => a.functionCall.gas)
  .reduce((totalGas, gas) => totalGas.add(gas), new BN(0))
  .toString();

function Sign() {
  const [searchParams] = useSearchParams();
  const [callbackUrl] = React.useState(searchParams.get('callbackUrl'));
  const [transactionDetails, setTransactionDetails] = React.useState<TransactionDetails>({
      signerId: '',
      receiverId: '',
      totalAmount: '0',
      fees: {
        transactionFees: '',
        gasLimit: '',
        gasPrice: '',
      },
      transactions: [],
      actions: [],
    });
  const authenticated = useAuthState();
  const [showDetails, setShowDetails] = React.useState(false);

  React.useEffect(() => {
    const transactionHashes = searchParams.get('transactions');
    const deserializedTransactions =      deserializeTransactionsFromString(transactionHashes);
    const allActions = deserializedTransactions.flatMap((t) => t.actions);
    setTransactionDetails({
      signerId:    deserializedTransactions[0].signerId,
      receiverId:  deserializedTransactions[0].receiverId,
      totalAmount: allActions
        .map((a) => a?.transfer?.deposit || a?.functionCall?.deposit || 0)
        .filter((a) => a !== 0)
        .reduce(
          (totalAmount: BN, amount) => totalAmount.add(new BN(amount)),
          new BN(0)
        )
        .toString(),
      fees: {
        transactionFees: '',
        gasLimit:        calculateGasLimit(allActions),
        gasPrice:        '',
      },
      transactions: deserializedTransactions,
      actions:      allActions,
    });
  }, []);



  const storeFetchedUsdValues = fiatValuesStore(
    (state) => state.storeFetchedUsdValues
  );
  const fiatValueUsd = fiatValuesStore((state) => state.fiatValueUsd);

  React.useEffect(() => {
    new Promise(() => {
      fetchRefFinancePrices()
        .then((res) => {
          storeFetchedUsdValues(res.near.usd);
        })
        .catch(() => {
          console.warn('Ref Finance Error');
        });

      fetchGeckoPrices('near')
        .then((res) => {
          storeFetchedUsdValues(res.near.usd);
        })
        .catch(() => {
          console.warn('Coin Gecko Error');
        });
    });
  }, []);

  
  const totalNearAmount = () => formatNearAmount(transactionDetails.totalAmount);

  const totalUsdAmount = (
    Number(totalNearAmount()) * Number(fiatValueUsd)
  ).toFixed(2).toString();

  const estimatedNearFees = formatNearAmount(transactionDetails.fees.gasPrice);

  const estimatedUsdFees = () => {
    let usdFees: string;
    estimatedNearFees.includes('<')
      ? (usdFees = '< $0.01')
      : (usdFees = (
          Number(estimatedNearFees) * Number(fiatValueUsd)
        ).toString());
    return usdFees;
  };

  const onConfirm = async () => {
    if (authenticated) {
      const signedTransactions = [];
      for (let i = 0; i < transactionDetails.transactions.length; i += 1) {
        try {
          const signed = await (window as any).fastAuthController.signDelegateAction(transactionDetails.transactions[i]);
          const base64 =  Buffer.from(encodeSignedDelegate(signed)).toString('base64');
          signedTransactions.push(base64);
        } catch (err) {
          console.error(err);
        }
      }
      const success_url = searchParams.get('success_url');
      const parsedUrl = new URL(success_url || window.location.origin);
      parsedUrl.searchParams.set('transactions', signedTransactions.join(','));
      window.location.replace(parsedUrl.href);
    }
  };

  const onCancel = () => {
    try {
      const url = new URL(callbackUrl);
      url.searchParams.append('error', 'User cancelled action');
      window.location.replace(url);
    } catch (error) {
      alert('Invalid callback URL');
    }
  };

  return (
    <ModalSignWrapper>
      <div className="modal-top">
        <RefLogoSvg />
        <h4>Confirm transaction</h4>

        <div className="transaction-details">
          <InternetSvg />
          {callbackUrl || 'Unknown App'}
        </div>
      </div>
      <div className="modal-middle">
        <div className="table-wrapper">
          <TableContent
            leftSide="From"
            rightSide={transactionDetails.signerId}
          />
          <TableContent
            leftSide="Total"
            infoText="The estimated total of your transaction including fees."
            rightSide={`${totalNearAmount()} NEAR`}
            currencyValue={`$${totalUsdAmount}`}
          />
        </div>
      </div>
      <div
        className="more-details"
        onClick={() => setShowDetails(!showDetails)}
      >
        More details
        <span>{showDetails ? <ArrowUpSvg /> : <ArrowDownSvg />}</span>
      </div>
      {showDetails && (
        <div className="more-details-opened">
          <div className="table-wrapper">
            <h4>Network fees</h4>
            <TableContent
              leftSide="Fee limit"
              rightSide={`${transactionDetails.fees.gasLimit} Tgas`}
            />
            <TableContent
              leftSide="Estimated Fees"
              infoText="The estimated cost of processing your transaction."
              rightSide={`${estimatedNearFees} NEAR`}
              currencyValue={`${estimatedUsdFees()}`}
            />
          </div>
          <div className="table-wrapper">
            <h4>Actions</h4>
            {transactionDetails.actions.map((action, i) => (
              <TableContent
                key={i}
                leftSide={transactionDetails.receiverId}
                hasFunctionCall
                isFunctionCallOpen
                rightSide={action.enum}
                functionDesc={<pre>{JSON.stringify(action, null, 2)}</pre>}
                openLink={`add links ${i}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="modal-footer">
        <Button
          variant="primary"
          size="large"
          label="Confirm"
          onClick={onConfirm}
        />
        <Button
          variant="secondary"
          size="large"
          label="Cancel"
          fill="ghost"
          onClick={onCancel}
        />
      </div>
    </ModalSignWrapper>
  );
}

export default Sign;
