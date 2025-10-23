import Header, { HeaderLeft, HeaderRight } from '../../../components/layouts/Header/Header';
import DefaultHeaderRightCommon from './_common/DefaultHeaderRight.common';
import SelectSucursalEmpresa from './_partial/SelectSucursalEmpresa';

const DefaultHeaderTemplate = () => {
	return (
		<Header>
			<HeaderLeft>
				<></>
				{/* <SearchPartial /> */}
			</HeaderLeft>
			<HeaderRight>
				<SelectSucursalEmpresa />
				<DefaultHeaderRightCommon />
			</HeaderRight>
		</Header>
	);
};

export default DefaultHeaderTemplate;
