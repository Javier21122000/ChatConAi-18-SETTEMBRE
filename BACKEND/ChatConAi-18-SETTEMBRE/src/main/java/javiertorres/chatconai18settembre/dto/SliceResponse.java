package javiertorres.chatconai18settembre.dto;

import org.springframework.data.domain.Slice;
import java.util.List;

public record SliceResponse<T>(List<T> items, int page, boolean hasNext) {
    public static <T> SliceResponse<T> from(Slice<T> slice) {
        return new SliceResponse<>(slice.getContent(), slice.getNumber(), slice.hasNext());
    }
}
