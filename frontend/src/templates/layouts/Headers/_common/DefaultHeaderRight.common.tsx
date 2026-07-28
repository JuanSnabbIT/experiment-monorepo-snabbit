import NotificationPartial from '../_partial/Notification.partial';
import SettingsPartial from '../_partial/Settings.partial';
import HelpPartial from '../_partial/Help.partial';
// import MessagesPartial from '../_partial/Messages.partial';

const DefaultHeaderRightCommon = () => {
    return (
        <>
            {/* <MessagesPartial /> */}
            <HelpPartial />
            <NotificationPartial />
            <SettingsPartial />
            {/* <LanguageSelectorPartial /> */}
        </>
    );
};

export default DefaultHeaderRightCommon;
