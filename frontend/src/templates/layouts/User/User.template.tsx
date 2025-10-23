import React from 'react';
import Icon from '../../../components/icon/Icon';
import Badge from '../../../components/ui/Badge';
import { NavButton, NavItem, NavSeparator } from '../../../components/layouts/Navigation/Nav';
import { authPages } from '../../../config/pages.config';
import User from '../../../components/layouts/User/User';
import { useAppDispatch, useAppSelector } from '@/store';
import { LOGOUT } from '@/store/slices/auth/authSlice';

const UserTemplate = () => {
	// const { isLoading, userData, onLogout } = useAuth();
    const dispatch = useAppDispatch()
    const { userMe: userData, isAuthenticated, loading: isLoading } = useAppSelector((state) => state.auth)

	return (
		<User
			isLoading={isLoading}
			name={userData?.first_name || ''}
			nameSuffix={<Icon icon='HeroCheckBadge' color='blue' />}
			position={"POSITION ?"}
			src={userData?.image ? userData.image : ""}
			suffix={
				<Badge color='amber' variant='solid' className='text-xs font-bold'>
					PRO
				</Badge>
			}>
			<NavSeparator />
			<NavItem {...authPages.profilePage} />
			{/* <NavItem {...appPages.mailAppPages.subPages.inboxPages}>
				<Badge variant='solid' className='leading-none'>
					3
				</Badge>
				<NavButton icon='HeroPlusCircle' title='New Mail' onClick={() => {}} />
			</NavItem> */}
			<NavItem text='Logout' icon='HeroArrowRightOnRectangle' onClick={() => {dispatch(LOGOUT())}} />
		</User>
	);
};

export default UserTemplate;
