import type { ReactElement } from "react";
import { Button, ListingTable } from "@wso2/oxygen-ui";
import { money, type ExpenseLine } from "../claims";

interface Props {
  lines: readonly ExpenseLine[];
  /** Present only where lines may be removed (the edit screen). */
  onRemove?: (line: ExpenseLine) => void;
  busy?: boolean;
}

/** The expense lines of a claim: Date, Category, Note, Receipt, Amount. */
export function LinesTable({ lines, onRemove, busy }: Props): ReactElement {
  const columns = 5 + (onRemove ? 1 : 0);
  return (
    <ListingTable.Container>
      <ListingTable>
        <ListingTable.Head>
          <ListingTable.Row>
            <ListingTable.Cell>Date</ListingTable.Cell>
            <ListingTable.Cell>Category</ListingTable.Cell>
            <ListingTable.Cell>Note</ListingTable.Cell>
            <ListingTable.Cell>Receipt</ListingTable.Cell>
            <ListingTable.Cell align="right">Amount</ListingTable.Cell>
            {onRemove && <ListingTable.Cell />}
          </ListingTable.Row>
        </ListingTable.Head>
        <ListingTable.Body>
          {lines.length === 0 ? (
            <ListingTable.Row>
              <ListingTable.Cell colSpan={columns}>
                <ListingTable.EmptyState title="No expense lines" description="Add a line to build the claim." />
              </ListingTable.Cell>
            </ListingTable.Row>
          ) : (
            lines.map((l) => (
              <ListingTable.Row key={l.id}>
                <ListingTable.Cell>{l.date}</ListingTable.Cell>
                <ListingTable.Cell>{l.categoryName ?? l.categoryId}</ListingTable.Cell>
                <ListingTable.Cell>{l.note ?? ""}</ListingTable.Cell>
                <ListingTable.Cell>{l.receiptFileName ?? "None"}</ListingTable.Cell>
                <ListingTable.Cell align="right">{money(l.amountCents)}</ListingTable.Cell>
                {onRemove && (
                  <ListingTable.Cell align="right">
                    <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => onRemove(l)}>
                      Remove
                    </Button>
                  </ListingTable.Cell>
                )}
              </ListingTable.Row>
            ))
          )}
        </ListingTable.Body>
      </ListingTable>
    </ListingTable.Container>
  );
}
