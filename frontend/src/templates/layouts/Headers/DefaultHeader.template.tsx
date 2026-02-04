import Header, { HeaderLeft, HeaderRight } from '../../../components/layouts/Header/Header';
import DefaultHeaderRightCommon from './_common/DefaultHeaderRight.common';

const DefaultHeaderTemplate = () => {
    return (
        <Header>
            <HeaderLeft>
                <></>
                {/* <SearchPartial /> */}
            </HeaderLeft>
            <HeaderRight>
                <DefaultHeaderRightCommon />
            </HeaderRight>
        </Header>
    );
};

export default DefaultHeaderTemplate;
