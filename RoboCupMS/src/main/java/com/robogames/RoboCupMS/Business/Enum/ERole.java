package com.robogames.RoboCupMS.Business.Enum;

/**
 * Role uzivatele
 */
public enum ERole {

    /**
     * Role soutezici
     */
    COMPETITOR,

    /**
     * Role admin
     */
    ADMIN,

    /**
     * Role vedouci
     */
    LEADER,

    /**
     * Role asistent
     */
    ASSISTANT,

    /**
     * Role rozhodci
     */
    REFEREE;

    public static class Names {
        public static final String COMPETITOR = "ROLE_COMPETITOR";
        public static final String ADMIN = "ROLE_ADMIN";
        public static final String LEADER = "ROLE_LEADER";
        public static final String ASSISTANT = "ROLE_ASSISTANT";
        public static final String REFEREE = "ROLE_REFEREE";
    }

}
