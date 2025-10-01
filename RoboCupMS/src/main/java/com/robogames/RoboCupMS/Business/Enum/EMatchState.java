package com.robogames.RoboCupMS.Business.Enum;

/**
 * Role uzivatele
 */
public enum EMatchState {

    /**
     * zapas ceka na odehrani (jeste neni znamo skore)
     */
    WAITING,

    /**
     * Zapas byl jiz odehran
     */
    DONE,

    /**
     * Zopakovat zapas znovu (skore pro tento zapas se prepise)
     */
    REMATCH

}
