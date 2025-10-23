import Input from "@/components/form/Input";
import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Button from "@/components/ui/Button";
import { CardFooter, CardFooterChild } from "@/components/ui/Card";
import { ITableProps } from "@/components/ui/Table";
import { Table as TTableProps } from '@tanstack/react-table';
import { FC } from "react";

interface ITableCardFooterTemplateProps extends Partial<ITableProps> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	table: TTableProps<any>;
}

export const TableCardFooterTemplateV2: FC<ITableCardFooterTemplateProps> = ({ table }) => {
	return (
		<CardFooter>
			<CardFooterChild>
				<div className="min-w-36">
					<SelectReact
						menuPlacement="top"
						options={[
							{value: "5", label: "Mostrar 5"},
							{value: "10", label: "Mostrar 10"},
							{value: "20", label: "Mostrar 20"},
							{value: "30", label: "Mostrar 30"},
							{value: "40", label: "Mostrar 40"},
							{value: "50", label: "Mostrar 50"},
						]}
						value={{value: table.getState().pagination.pageSize.toString(), label: `Mostrar ${table.getState().pagination.pageSize.toString()}`}}
						onChange={(e) => {
							table.setPageSize(Number((e as TSelectOption).value));
						}}
						className='!w-full'
						name='pageSize'
					/>
				</div>
			</CardFooterChild>
			<CardFooterChild>
				<Button
					onClick={() => table.setPageIndex(0)}
					isDisable={!table.getCanPreviousPage()}
					icon='HeroChevronDoubleLeft'
					className='!px-0'
				/>
				<Button
					onClick={() => table.previousPage()}
					isDisable={!table.getCanPreviousPage()}
					icon='HeroChevronLeft'
					className='!px-0'
				/>
				<span className='flex items-center gap-1'>
					<div>Pagina</div>
					<strong>
						<Input
							value={table.getState().pagination.pageIndex + 1}
							onChange={(e) => {
								const page = e.target.value ? Number(e.target.value) - 1 : 0;
								table.setPageIndex(page);
							}}
							className='inline-flex !w-12 text-center'
							name='page'
						/>{' '}
						de {table.getPageCount()}
					</strong>
				</span>
				<Button
					onClick={() => table.nextPage()}
					isDisable={!table.getCanNextPage()}
					icon='HeroChevronRight'
					className='!px-0'
				/>
				<Button
					onClick={() => table.setPageIndex(table.getPageCount() - 1)}
					isDisable={!table.getCanNextPage()}
					icon='HeroChevronDoubleRight'
					className='!px-0'
				/>
			</CardFooterChild>
		</CardFooter>
	);
};

export default TableCardFooterTemplateV2