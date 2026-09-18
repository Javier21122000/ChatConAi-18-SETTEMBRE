package javiertorres.chatconai18settembre.dto;

import javiertorres.chatconai18settembre.entity.UserAccount;

public record UserView(long id, String username) {
    public static UserView from(UserAccount user) {
        return new UserView(user.getId(), user.getUsername());
    }
}
